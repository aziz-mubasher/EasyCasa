import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { eq, sql } from 'drizzle-orm';

import { DefaultCredentialPolicy } from '../assignments/credential-policy';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings, serviceCatalogItems } from '../db/schema';
import { RequiresAdminRole } from '../auth/admin-role.decorator';
import { RequiresCapability } from '../auth/capability.decorator';
import {
  EMAIL_OUTBOX,
  OutboxEmailProvider,
} from '../email/providers/outbox-email.provider';
import { RetentionService } from '../privacy/retention.service';
import { CATALOG } from '../service-catalog/domain/catalog';
import { Phase8PricingAdapter } from '../orders/phase8-pricing.adapter';
import { CoverageAvailabilityService } from '../professionals/coverage-availability.service';
import type { RequiredCredential } from '../professionals/domain/types';
import type { LegalBasis } from '../transactions/domain/types';
import { toDbLegalBasis, toDomainLegalBasis } from '../transactions/status-map';
import { InjectConfig } from '../config/inject-config.decorator';
import type { ApiConfig } from '../config';
import { WhatsAppMessagesStore } from '../whatsapp/whatsapp-messages.store';

class SetLegalBasisDto {
  @IsIn(['MEDIAZIONE', 'MANDATO_ONEROSO', 'REVIEW_REQUIRED'])
  legalBasis!: LegalBasis;
}

class SetCredentialDto {
  @IsIn([
    'NONE',
    'REA_MEDIATORE',
    'ALBO_TECNICO',
    'ALBO_ISCRIZIONE',
    'APE_CERTIFIER',
    'CENED_ACCREDITAMENTO',
    'PHOTOGRAPHER',
    'NOTAIO',
  ])
  requiredCredential!: RequiredCredential;
}

@Controller('admin')
@RequiresCapability('admin')
export class AdminController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly pricing: Phase8PricingAdapter,
    private readonly credentialPolicy: DefaultCredentialPolicy,
    private readonly coverage: CoverageAvailabilityService,
    @Inject(EMAIL_OUTBOX) private readonly outbox: OutboxEmailProvider,
    private readonly retention: RetentionService,
    @InjectConfig() private readonly config: ApiConfig,
    private readonly whatsappMessages: WhatsAppMessagesStore,
  ) {}

  @Get('stats')
  @RequiresAdminRole('operations', 'support', 'superadmin')
  async stats() {
    const rows = await this.db
      .select({ status: listings.status, n: sql<number>`count(*)::int` })
      .from(listings)
      .groupBy(listings.status);
    return { listingsByStatus: rows };
  }

  /**
   * EC-16 — WhatsApp reminder delivery vs no-show (raw counts; not significance).
   * Optional `?days=90` (default 90).
   */
  @Get('whatsapp/metrics')
  @RequiresAdminRole('operations', 'support', 'superadmin')
  async whatsappMetrics(@Query('days') days?: string) {
    const n = days ? Number(days) : 90;
    return this.whatsappMessages.measurementSummary(Number.isFinite(n) && n > 0 ? n : 90);
  }

  /**
   * EC-10 — province × catalog-item coverage matrix (recruiting board).
   * Optional `?provinces=BS,MI,CR` filters columns; otherwise seeds + known coverage.
   */
  @Get('coverage-matrix')
  @RequiresAdminRole('operations', 'support')
  async coverageMatrix(@Query('provinces') provinces?: string) {
    const list = provinces
      ?.split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    return this.coverage.matrix(list);
  }

  @Get('coverage-demand')
  @RequiresAdminRole('operations', 'support')
  async coverageDemand(@Query('limit') limit?: string) {
    const n = limit ? Number(limit) : 50;
    return this.coverage.recentDemand(Number.isFinite(n) ? n : 50);
  }

  /** Pilot email audit trail — most recent last. */
  @Get('email-outbox')
  @RequiresAdminRole('operations', 'dpo')
  emailOutbox() {
    return this.outbox.list().map((e) => ({
      at: e.at.toISOString(),
      to: e.message.to,
      subject: e.message.subject,
      delivered: e.result.delivered,
      provider: e.result.provider,
      skipped: e.result.skipped ?? false,
    }));
  }

  /** Phase 38 — anonymize stale unconverted enquiry leads. */
  @Post('privacy/retention-purge')
  @RequiresAdminRole('dpo')
  async retentionPurge() {
    const anonymized = await this.retention.purgeStaleLeads(this.config.RETENTION_LEAD_DAYS);
    return { anonymized, retentionDays: this.config.RETENTION_LEAD_DAYS };
  }

  @Post('listings/:id/archive')
  @RequiresAdminRole('operations')
  archive(@Param('id') id: string) {
    return this.db
      .update(listings)
      .set({ status: 'archived' })
      .where(eq(listings.id, id))
      .returning();
  }

  /**
   * Full catalog for the Phase 13 compliance console (legal basis + credential).
   */
  @Get('catalog')
  @RequiresAdminRole('operations', 'support')
  async listCatalog() {
    const dbRows = await this.db.select().from(serviceCatalogItems);
    const byCode = new Map(dbRows.map((r) => [r.code, r]));

    return CATALOG.map((c) => {
      const row = byCode.get(c.code);
      const legalBasis = row
        ? toDomainLegalBasis(row.legalBasis)
        : this.pricing.legalBasisOf(c.code);
        return {
        code: c.code,
        labelEn: c.labelEn,
        labelIt: c.labelIt,
        labelEs: c.labelEs,
        category: c.category,
        priceModel: c.priceModel,
        legalBasis,
        requiredCredential: this.credentialPolicy.requiredCredentialFor(c.code),
      };
    });
  }

  /**
   * Catalog legal-basis review board. Items default to REVIEW_REQUIRED until
   * counsel classifies them; `reviewRequiredCount` is what blocks mandate SEND.
   */
  @Get('catalog/legal-basis')
  @RequiresAdminRole('operations', 'support')
  async listLegalBasis() {
    const items = await this.listCatalog();
    return {
      items: items.map(({ code, labelEn, labelIt, category, legalBasis }) => ({
        code,
        labelEn,
        labelIt,
        category,
        legalBasis,
      })),
      reviewRequiredCount: items.filter((i) => i.legalBasis === 'REVIEW_REQUIRED').length,
    };
  }

  @Put('catalog/:code/legal-basis')
  @Patch('catalog/:code/legal-basis')
  @RequiresAdminRole('operations')
  async setLegalBasis(@Param('code') code: string, @Body() body: SetLegalBasisDto) {
    await this.persistLegalBasis(code, body.legalBasis);
    return this.catalogItem(code);
  }

  @Put('catalog/:code/credential')
  @RequiresAdminRole('operations')
  async setRequiredCredential(@Param('code') code: string, @Body() body: SetCredentialDto) {
    const seed = CATALOG.find((c) => c.code === code);
    if (!seed) throw new NotFoundException(`Unknown catalog item ${code}`);
    await this.credentialPolicy.set(code, body.requiredCredential);
    return this.catalogItem(code);
  }

  private async persistLegalBasis(code: string, legalBasis: LegalBasis): Promise<void> {
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
        .set({ legalBasis: toDbLegalBasis(legalBasis) })
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
        legalBasis: toDbLegalBasis(legalBasis),
      });
    }

    this.pricing.setLegalBasis(code, legalBasis);
  }

  private async catalogItem(code: string) {
    const items = await this.listCatalog();
    const item = items.find((i) => i.code === code);
    if (!item) throw new NotFoundException(`Unknown catalog item ${code}`);
    return item;
  }
}
