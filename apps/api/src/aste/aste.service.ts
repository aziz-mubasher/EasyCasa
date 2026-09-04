import { randomBytes } from 'node:crypto';

import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { ITALIAN_PROVINCES, PRODUCT_EVENTS, normalizeProvinceSlug } from '@easycasa/shared';
import { eq, sql } from 'drizzle-orm';

import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { asteLeads } from '../db/schema';
import { EmailService } from '../email/email.service';
import { crmFireSafe } from '../crm/crm-fire-safe';
import { CRM_HOOKS, type CrmHooks } from '../crm/domain/ports';
import type { CreateAsteLeadDto } from './dto/create-aste-lead.dto';

const PROVINCE_SLUGS = new Set(ITALIAN_PROVINCES.map((p) => p.slug));

const SITE_ORIGIN = 'https://easycasaita.com';

function newGuideToken(): string {
  return randomBytes(24).toString('base64url');
}

function guideUrl(locale: string, token: string): string {
  return `${SITE_ORIGIN}/${locale}/aste/guida?t=${encodeURIComponent(token)}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class AsteService {
  private readonly log = new Logger(AsteService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly email: EmailService,
    private readonly analytics: ProductAnalyticsService,
    @Optional() @Inject(CRM_HOOKS) private readonly crmHooks?: CrmHooks,
  ) {}

  async createLead(dto: CreateAsteLeadDto): Promise<{
    ok: true;
    guideUrl: string;
    language: string;
    duplicate: boolean;
  }> {
    if (dto.consent !== true) {
      throw new BadRequestException('consent must be true');
    }

    const email = normalizeEmail(dto.email);
    let province: string | null = null;
    if (dto.province != null && String(dto.province).trim() !== '') {
      const slug = normalizeProvinceSlug(String(dto.province).trim());
      if (!slug || !PROVINCE_SLUGS.has(slug)) {
        throw new BadRequestException('invalid province');
      }
      province = slug;
    }

    const buyerType = dto.buyerType ?? null;
    const language = dto.language;
    const locale = dto.locale;

    const existing = await this.db
      .select({
        id: asteLeads.id,
        guideToken: asteLeads.guideToken,
      })
      .from(asteLeads)
      .where(sql`lower(${asteLeads.email}) = ${email}`)
      .limit(1);

    let token: string;
    let leadId: string;
    let duplicate = false;

    if (existing[0]) {
      duplicate = true;
      token = existing[0].guideToken;
      leadId = existing[0].id;
      await this.db
        .update(asteLeads)
        .set({
          language,
          locale,
          province,
          buyerType,
          consent: true,
          updatedAt: new Date(),
        })
        .where(eq(asteLeads.id, existing[0].id));
    } else {
      token = newGuideToken();
      const inserted = await this.db
        .insert(asteLeads)
        .values({
          email,
          language,
          locale,
          province,
          buyerType,
          consent: true,
          guideToken: token,
        })
        .returning({ id: asteLeads.id });
      leadId = inserted[0]?.id ?? existing[0]?.id ?? '';
    }

    const url = guideUrl(locale, token);

    // Structured analytics — never include email (PII).
    this.analytics.track(PRODUCT_EVENTS.ASTE_SIGNUP_SUBMITTED, {
      language,
      locale,
      province,
      buyerType,
      duplicate,
    });
    this.log.log(
      JSON.stringify({
        event: 'aste.lead_persisted',
        language,
        locale,
        province,
        buyerType,
        duplicate,
      }),
    );

    void this.email.asteGuideDelivery(email, {
      guideUrl: url,
      language,
    });

    if (leadId) {
      await crmFireSafe(
        'onAsteWaitlistLead',
        this.crmHooks
          ? () =>
              this.crmHooks!.onAsteWaitlistLead({
                asteLeadId: leadId,
                email,
                locale: language,
                province,
                buyerType,
              })
          : undefined,
      );
    }

    return { ok: true, guideUrl: url, language, duplicate };
  }

  async resolveGuideToken(token: string): Promise<{
    language: string;
    locale: string;
    province: string | null;
  }> {
    const trimmed = token.trim();
    if (!trimmed || trimmed.length < 16 || trimmed.length > 128) {
      throw new NotFoundException('guide not found');
    }
    const rows = await this.db
      .select({
        language: asteLeads.language,
        locale: asteLeads.locale,
        province: asteLeads.province,
      })
      .from(asteLeads)
      .where(eq(asteLeads.guideToken, trimmed))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('guide not found');

    this.analytics.track(PRODUCT_EVENTS.ASTE_GUIDE_OPENED, {
      language: row.language,
      locale: row.locale,
      province: row.province,
    });

    return row;
  }
}
