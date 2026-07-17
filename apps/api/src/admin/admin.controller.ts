import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { eq, sql } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings, serviceCatalogItems } from '../db/schema';
import { Roles } from '../auth/roles.decorator';
import { CATALOG } from '../service-catalog/domain/catalog';
import { Phase8PricingAdapter } from '../orders/phase8-pricing.adapter';
import type { LegalBasis } from '../transactions/domain/types';
import { toDbLegalBasis, toDomainLegalBasis } from '../transactions/status-map';

class SetLegalBasisDto {
  @IsIn(['MEDIAZIONE', 'MANDATO_ONEROSO', 'REVIEW_REQUIRED'])
  legalBasis!: LegalBasis;
}

@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly pricing: Phase8PricingAdapter,
  ) {}

  @Get('stats')
  async stats() {
    const rows = await this.db
      .select({ status: listings.status, n: sql<number>`count(*)::int` })
      .from(listings)
      .groupBy(listings.status);
    return { listingsByStatus: rows };
  }

  @Post('listings/:id/archive')
  archive(@Param('id') id: string) {
    return this.db
      .update(listings)
      .set({ status: 'archived' })
      .where(eq(listings.id, id))
      .returning();
  }

  /**
   * Catalog legal-basis review board. Items default to REVIEW_REQUIRED until
   * counsel classifies them; `reviewRequiredCount` is what blocks mandate SEND.
   */
  @Get('catalog/legal-basis')
  async listLegalBasis() {
    const dbRows = await this.db.select().from(serviceCatalogItems);
    const byCode = new Map(dbRows.map((r) => [r.code, r]));

    const items = CATALOG.map((c) => {
      const row = byCode.get(c.code);
      const legalBasis = row
        ? toDomainLegalBasis(row.legalBasis)
        : this.pricing.legalBasisOf(c.code);
      return {
        code: c.code,
        labelEn: c.labelEn,
        labelIt: c.labelIt,
        category: c.category,
        legalBasis,
      };
    });

    return {
      items,
      reviewRequiredCount: items.filter((i) => i.legalBasis === 'REVIEW_REQUIRED').length,
    };
  }

  @Patch('catalog/:code/legal-basis')
  async setLegalBasis(@Param('code') code: string, @Body() body: SetLegalBasisDto) {
    const seed = CATALOG.find((c) => c.code === code);
    if (!seed) throw new NotFoundException(`Unknown catalog item ${code}`);

    const existing = await this.db
      .select({ code: serviceCatalogItems.code })
      .from(serviceCatalogItems)
      .where(eq(serviceCatalogItems.code, code))
      .limit(1);

    if (existing[0]) {
      await this.db
        .update(serviceCatalogItems)
        .set({ legalBasis: toDbLegalBasis(body.legalBasis) })
        .where(eq(serviceCatalogItems.code, code));
    } else {
      await this.db.insert(serviceCatalogItems).values({
        code: seed.code,
        labelEn: seed.labelEn,
        labelIt: seed.labelIt,
        category: seed.category,
        priceModel: seed.priceModel,
        amountCents: seed.amountCents ?? null,
        ratePercent: seed.ratePercent ?? null,
        ivaApplicable: seed.ivaApplicable,
        active: true,
        legalBasis: toDbLegalBasis(body.legalBasis),
      });
    }

    this.pricing.setLegalBasis(code, body.legalBasis);
    return { code, legalBasis: body.legalBasis };
  }
}
