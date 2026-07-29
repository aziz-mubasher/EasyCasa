import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { count, desc } from 'drizzle-orm';
import { normalizeProvinceSlug } from '@easycasa/shared';

import { DefaultCredentialPolicy } from '../assignments/credential-policy';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { serviceDemandLog } from '../db/schema';
import { CATALOG } from '../service-catalog/domain/catalog';
import { ProfessionalsService } from './professionals.service';
import {
  itemCoverageAvailability,
  type ItemCoverageAvailability,
} from './domain/coverage';
import type { RequiredCredential } from './domain/types';

export type CatalogItemAvailability = ItemCoverageAvailability & {
  itemCode: string;
  requiredCredential: RequiredCredential;
};

export type CoverageMatrixCell = {
  itemCode: string;
  province: string;
  available: boolean;
  qualifiedCount: number;
  capacityConstrained: boolean;
  demandCount: number;
};

@Injectable()
export class CoverageAvailabilityService {
  private readonly log = new Logger(CoverageAvailabilityService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly professionals: ProfessionalsService,
    private readonly policies: DefaultCredentialPolicy,
  ) {}

  async availabilityForItem(
    itemCode: string,
    provinceRaw: string | null | undefined,
    now: Date = new Date(),
  ): Promise<CatalogItemAvailability> {
    const requiredCredential = this.policies.requiredCredentialFor(itemCode);
    const province = provinceRaw ? normalizeProvinceSlug(provinceRaw) ?? provinceRaw.trim().toUpperCase() : null;
    const pros = await this.professionals.list();
    const result = itemCoverageAvailability(requiredCredential, province, pros, now);
    return { itemCode, requiredCredential, ...result };
  }

  async availabilityForItems(
    itemCodes: string[],
    provinceRaw: string | null | undefined,
    now: Date = new Date(),
  ): Promise<CatalogItemAvailability[]> {
    const province = provinceRaw ? normalizeProvinceSlug(provinceRaw) ?? provinceRaw.trim().toUpperCase() : null;
    const pros = await this.professionals.list();
    return itemCodes.map((itemCode) => {
      const requiredCredential = this.policies.requiredCredentialFor(itemCode);
      return {
        itemCode,
        requiredCredential,
        ...itemCoverageAvailability(requiredCredential, province, pros, now),
      };
    });
  }

  /** Hard-reject if any item is unavailable in the province. */
  async assertOrderable(
    itemCodes: string[],
    provinceRaw: string | null | undefined,
  ): Promise<void> {
    const unique = [...new Set(itemCodes.filter(Boolean))];
    if (unique.length === 0) return;
    const results = await this.availabilityForItems(unique, provinceRaw);
    const blocked = results.filter((r) => !r.available);
    if (blocked.length === 0) return;
    const detail = blocked
      .map((b) => `${b.itemCode}: ${b.reasonIt ?? b.reasonEn ?? b.reason}`)
      .join('; ');
    throw new BadRequestException(
      `Service not available in this province — ${detail}`,
    );
  }

  async logDemand(input: {
    itemCode: string;
    province: string;
    userId?: string | null;
  }): Promise<{ id: string }> {
    const province =
      normalizeProvinceSlug(input.province) ?? input.province.trim().toUpperCase();
    if (!province) throw new BadRequestException('province is required');
    if (!input.itemCode.trim()) throw new BadRequestException('itemCode is required');

    const rows = await this.db
      .insert(serviceDemandLog)
      .values({
        itemCode: input.itemCode.trim(),
        province,
        userId: input.userId ?? null,
      })
      .returning({ id: serviceDemandLog.id });
    const id = rows[0]?.id;
    if (!id) throw new BadRequestException('failed to log demand');
    this.log.log(`demand log ${input.itemCode}@${province} id=${id}`);
    return { id };
  }

  /**
   * Admin matrix: active catalog items × requested provinces (or those with
   * any coverage / demand).
   */
  async matrix(provinces?: string[]): Promise<CoverageMatrixCell[]> {
    const pros = await this.professionals.list();
    const itemCodes = CATALOG.map((c) => c.code);
    const provSet = new Set<string>();
    for (const p of provinces ?? []) {
      const n = normalizeProvinceSlug(p) ?? p.trim().toUpperCase();
      if (n) provSet.add(n);
    }
    if (provSet.size === 0) {
      for (const pro of pros) {
        for (const p of pro.coverageProvinces) {
          const n = normalizeProvinceSlug(p) ?? p.trim().toUpperCase();
          if (n) provSet.add(n);
        }
      }
      const demandProvinces = await this.db
        .selectDistinct({ province: serviceDemandLog.province })
        .from(serviceDemandLog);
      for (const row of demandProvinces) {
        if (row.province) provSet.add(row.province.toUpperCase());
      }
      // Always show a few recruiting targets even with empty pros.
      for (const seed of ['MI', 'BS', 'CR', 'BG', 'MB']) provSet.add(seed);
    }

    const demandRows = await this.db
      .select({
        itemCode: serviceDemandLog.itemCode,
        province: serviceDemandLog.province,
        n: count(),
      })
      .from(serviceDemandLog)
      .groupBy(serviceDemandLog.itemCode, serviceDemandLog.province);

    const demandMap = new Map<string, number>();
    for (const row of demandRows) {
      demandMap.set(`${row.itemCode}|${row.province.toUpperCase()}`, Number(row.n));
    }

    const now = new Date();
    const cells: CoverageMatrixCell[] = [];
    for (const province of [...provSet].sort()) {
      for (const itemCode of itemCodes) {
        const requiredCredential = this.policies.requiredCredentialFor(itemCode);
        const avail = itemCoverageAvailability(requiredCredential, province, pros, now);
        cells.push({
          itemCode,
          province,
          available: avail.available,
          qualifiedCount:
            avail.qualifiedCount === Number.POSITIVE_INFINITY ? -1 : avail.qualifiedCount,
          capacityConstrained: avail.capacityConstrained,
          demandCount: demandMap.get(`${itemCode}|${province}`) ?? 0,
        });
      }
    }
    return cells;
  }

  async recentDemand(limit = 50): Promise<
    { id: string; itemCode: string; province: string; userId: string | null; createdAt: Date }[]
  > {
    const rows = await this.db
      .select()
      .from(serviceDemandLog)
      .orderBy(desc(serviceDemandLog.createdAt))
      .limit(Math.min(Math.max(limit, 1), 200));
    return rows.map((r) => ({
      id: r.id,
      itemCode: r.itemCode,
      province: r.province,
      userId: r.userId,
      createdAt: r.createdAt,
    }));
  }
}
