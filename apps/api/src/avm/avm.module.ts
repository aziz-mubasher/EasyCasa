import { Inject, Injectable, Module } from '@nestjs/common';
import { and, desc, eq, gt, isNotNull, sql } from 'drizzle-orm';

import { normalizeProvinceSlug } from '@easycasa/shared';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings, omiQuotes, valuationRequests } from '../db/schema';
import { AvmController } from './avm.controller';
import { AvmService, COMPARABLES_PORT, OMI_PORT, VALUATION_REQUEST_LOG } from './avm.service';
import type { ComparablesPort, OmiPort, ValuationRequestLog } from './domain/ports';
import { AREA_VALUATION_PROVIDER } from './domain/area-valuation.port';
import { FallbackAreaValuationProvider } from './fallback-area-valuation.provider';
import { normalizePropertyType } from './domain/normalize-property-type';
import { OmiAreaValuationProvider } from './omi-area-valuation.provider';
import { StubAreaValuationProvider } from './stub-area-valuation.provider';
import { ValuationBandService } from './valuation-band.service';
import { normalizeOmiComune } from '../omi/normalize-comune';
import type {
  Comparable,
  Condition,
  EnergyClass,
  OmiBand,
  PropertyType,
  SubjectProperty,
  ValuationEstimate,
} from './domain/types';

const ENERGY: ReadonlySet<string> = new Set([
  'A4',
  'A3',
  'A2',
  'A1',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
]);
const CONDITIONS: ReadonlySet<string> = new Set(['new', 'renovated', 'good', 'to_renovate']);

function parseFloor(raw: string | null): number | null {
  if (raw == null || raw.trim() === '') return null;
  const n = Number.parseInt(raw.replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function parseEnergy(raw: string | null): EnergyClass | null {
  if (!raw) return null;
  const e = raw.trim().toUpperCase();
  return ENERGY.has(e) ? (e as EnergyClass) : null;
}

function parseCondition(raw: string | null): Condition | null {
  if (!raw) return null;
  const c = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (CONDITIONS.has(c)) return c as Condition;
  if (c.includes('nuov') || c.includes('new')) return 'new';
  if (c.includes('ristruttur') || c.includes('renovat')) return 'renovated';
  if (c.includes('da_ristruttur') || c.includes('to_renovat')) return 'to_renovate';
  if (c.includes('buon') || c.includes('good')) return 'good';
  return null;
}

/**
 * Comparables from listings: same provincia, priced, with coordinates.
 * €/m² from asking price/area; recency from `updatedAt`. Replace with sold
 * prices when transaction data is available.
 */
@Injectable()
export class DrizzleComparables implements ComparablesPort {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async near(subject: SubjectProperty): Promise<Comparable[]> {
    const rows = await this.db
      .select({
        id: listings.id,
        latitude: listings.latitude,
        longitude: listings.longitude,
        propertyType: listings.propertyType,
        sizeSqm: listings.sizeSqm,
        price: listings.price,
        energyClass: listings.energyClass,
        floor: listings.floor,
        condition: listings.condition,
        updatedAt: listings.updatedAt,
      })
      .from(listings)
      .where(
        and(
          eq(listings.province, subject.provincia),
          eq(listings.status, 'published'),
          isNotNull(listings.latitude),
          isNotNull(listings.longitude),
          isNotNull(listings.price),
          isNotNull(listings.sizeSqm),
          gt(sql`(${listings.sizeSqm})::numeric`, 0),
          gt(sql`(${listings.price})::numeric`, 0),
        ),
      )
      .limit(300);

    const now = Date.now();
    const out: Comparable[] = [];
    for (const r of rows) {
      const resolvedType = normalizePropertyType(r.propertyType);
      if (!resolvedType || resolvedType !== subject.type) continue;
      if (r.latitude == null || r.longitude == null) continue;
      const areaM2 = Number(r.sizeSqm);
      const priceEur = Number(r.price);
      if (!(areaM2 > 0) || !(priceEur > 0)) continue;
      out.push({
        id: r.id,
        lat: r.latitude,
        lng: r.longitude,
        type: resolvedType,
        areaM2,
        pricePerM2Cents: Math.round((priceEur * 100) / areaM2),
        energyClass: parseEnergy(r.energyClass),
        floor: parseFloor(r.floor),
        condition: parseCondition(r.condition),
        soldMonthsAgo: Math.max(
          0,
          Math.floor((now - r.updatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)),
        ),
      });
    }
    return out;
  }
}

/** OMI band lookup from cache; fail-soft (null) when absent. */
@Injectable()
export class DrizzleOmiPort implements OmiPort {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async band(comune: string, provincia: string, type: PropertyType): Promise<OmiBand | null> {
    const prov = normalizeProvinceSlug(provincia.trim());
    const com = normalizeOmiComune(comune);
    if (!prov || !com) return null;

    const rows = await this.db
      .select({
        minPerM2Cents: omiQuotes.minPerM2Cents,
        maxPerM2Cents: omiQuotes.maxPerM2Cents,
        period: omiQuotes.period,
      })
      .from(omiQuotes)
      .where(
        and(eq(omiQuotes.comune, com), eq(omiQuotes.provincia, prov), eq(omiQuotes.type, type)),
      )
      .orderBy(desc(omiQuotes.period))
      .limit(200);

    if (rows.length === 0) return null;
    const period = rows[0]!.period;
    const samePeriod = rows.filter((r) => r.period === period);
    const min = Math.min(...samePeriod.map((r) => r.minPerM2Cents));
    const max = Math.max(...samePeriod.map((r) => r.maxPerM2Cents));
    return { minPerM2Cents: min, maxPerM2Cents: max };
  }
}

@Injectable()
export class DrizzleValuationRequestLog implements ValuationRequestLog {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async record(input: {
    subject: SubjectProperty;
    estimate: ValuationEstimate;
    contactEmail: string | null;
    userId: string | null;
  }): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(valuationRequests)
      .values({
        userId: input.userId,
        contactEmail: input.contactEmail,
        comune: input.subject.comune,
        provincia: input.subject.provincia,
        subject: input.subject,
        estimate: input.estimate,
        pointCents: input.estimate.pointCents,
      })
      .returning({ id: valuationRequests.id });
    return { id: row.id };
  }
}

@Module({
  controllers: [AvmController],
  providers: [
    AvmService,
    ValuationBandService,
    OmiAreaValuationProvider,
    StubAreaValuationProvider,
    FallbackAreaValuationProvider,
    { provide: COMPARABLES_PORT, useClass: DrizzleComparables },
    { provide: OMI_PORT, useClass: DrizzleOmiPort },
    { provide: VALUATION_REQUEST_LOG, useClass: DrizzleValuationRequestLog },
    { provide: AREA_VALUATION_PROVIDER, useClass: FallbackAreaValuationProvider },
  ],
  exports: [AvmService, ValuationBandService],
})
export class AvmModule {}
