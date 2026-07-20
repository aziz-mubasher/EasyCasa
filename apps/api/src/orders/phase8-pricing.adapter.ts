import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { buildQuote } from '../service-catalog/domain/pricing';
import { CATALOG, PACKAGES } from '../service-catalog/domain/catalog';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { serviceCatalogItems } from '../db/schema';
import type { PricingPort } from '../transactions/domain/ports';
import type { LegalBasis, QuoteRequest, QuoteResult } from '../transactions/domain/types';
import { toDomainLegalBasis } from '../transactions/status-map';

const PACKAGE_CONTENTS: Record<string, readonly string[]> = Object.fromEntries(
  PACKAGES.map((p) => [p.code, p.includes]),
);

@Injectable()
export class Phase8PricingAdapter implements PricingPort, OnModuleInit {
  private readonly logger = new Logger(Phase8PricingAdapter.name);
  private readonly legal = new Map<string, LegalBasis>();

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.reloadLegalBasis();
    } catch (e) {
      // REVIEW_REQUIRED fallback until reload; CI boot-check needs no Postgres.
      this.logger.warn(`Pricing legal-basis DB not ready at boot: ${(e as Error).message}`);
    }
  }

  async reloadLegalBasis(): Promise<void> {
    this.legal.clear();
    const rows = await this.db
      .select({ code: serviceCatalogItems.code, legalBasis: serviceCatalogItems.legalBasis })
      .from(serviceCatalogItems);
    for (const row of rows) {
      this.legal.set(row.code, toDomainLegalBasis(row.legalBasis));
    }
  }

  /** Called after admin updates so SEND gating sees fresh values without restart. */
  setLegalBasis(code: string, basis: LegalBasis): void {
    this.legal.set(code, basis);
  }

  quote(req: QuoteRequest): QuoteResult {
    return buildQuote(req) as unknown as QuoteResult;
  }

  resolveItemCodes(req: QuoteRequest): string[] {
    const set = new Set<string>();
    if (req.packageCode) {
      for (const c of PACKAGE_CONTENTS[req.packageCode] ?? []) set.add(c);
    }
    for (const c of req.items ?? []) set.add(c);
    return [...set];
  }

  legalBasisOf(itemCode: string): LegalBasis {
    return this.legal.get(itemCode) ?? 'REVIEW_REQUIRED';
  }
}

void CATALOG;
