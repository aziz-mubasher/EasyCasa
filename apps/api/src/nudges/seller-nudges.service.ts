import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import {
  DEFAULT_NUDGE_CONFIG,
  daysOnMarket,
  evaluateNudges,
  isNudgeCode,
  type ListingMetrics,
  type Nudge,
  type NudgeCode,
  type NudgeHistory,
} from '@easycasa/shared';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { enquiries, listingNudges, listings } from '../db/schema';
import { listingToPublishRecord } from '../listings/listing-trust';
import {
  OmiBandService,
  positionAskingOnBand,
} from '../omi/omi-band.service';
import { SellerAnalyticsService } from '../seller-analytics/seller-analytics.service';

function asNumber(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function readOmiZoneId(attrs: unknown): string | null {
  if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) return null;
  const raw = (attrs as Record<string, unknown>).omiZoneId;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function utcDayString(now: Date): string {
  return now.toISOString().slice(0, 10);
}

@Injectable()
export class SellerNudgesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly omiBand: OmiBandService,
    private readonly analytics: SellerAnalyticsService,
  ) {}

  async assertOwner(actorUserId: string, listingId: string) {
    const rows = await this.db
      .select({
        id: listings.id,
        status: listings.status,
        firstPublishedAt: listings.firstPublishedAt,
        publishedAt: listings.publishedAt,
        unpublishedAt: listings.unpublishedAt,
        price: listings.price,
        sizeSqm: listings.sizeSqm,
        propertyType: listings.propertyType,
        condition: listings.condition,
        attributes: listings.attributes,
        ownerUserId: listings.ownerUserId,
        agentId: listings.agentId,
      })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('listing not found');
    const owner = row.ownerUserId ?? row.agentId;
    if (owner !== actorUserId) throw new ForbiddenException('not your listing');
    return row;
  }

  /** Active (non-dismissed) nudges — latest emission per code, with numeric payload. */
  async listActive(actorUserId: string, listingId: string) {
    await this.assertOwner(actorUserId, listingId);
    const rows = await this.db
      .select({
        code: listingNudges.code,
        emittedAt: listingNudges.emittedAt,
        dismissedAt: listingNudges.dismissedAt,
        payload: listingNudges.payload,
      })
      .from(listingNudges)
      .where(
        and(eq(listingNudges.listingId, listingId), isNull(listingNudges.dismissedAt)),
      )
      .orderBy(desc(listingNudges.emittedAt));

    const seen = new Set<string>();
    const items: Array<{ code: NudgeCode; emittedAt: string; data: Record<string, number> }> =
      [];
    for (const r of rows) {
      if (!isNudgeCode(r.code)) continue;
      if (seen.has(r.code)) continue;
      seen.add(r.code);
      const data =
        r.payload && typeof r.payload === 'object' && !Array.isArray(r.payload)
          ? Object.fromEntries(
              Object.entries(r.payload as Record<string, unknown>).filter(
                (e): e is [string, number] => typeof e[1] === 'number',
              ),
            )
          : {};
      items.push({ code: r.code, emittedAt: r.emittedAt.toISOString(), data });
    }
    return { items };
  }

  async dismiss(actorUserId: string, listingId: string, codeRaw: string) {
    await this.assertOwner(actorUserId, listingId);
    if (!isNudgeCode(codeRaw)) throw new NotFoundException('unknown nudge code');

    const now = new Date();
    const updated = await this.db
      .update(listingNudges)
      .set({ dismissedAt: now })
      .where(
        and(
          eq(listingNudges.listingId, listingId),
          eq(listingNudges.code, codeRaw),
          isNull(listingNudges.dismissedAt),
        ),
      )
      .returning({ code: listingNudges.code });

    if (updated.length === 0) {
      const any = await this.db
        .select({ code: listingNudges.code })
        .from(listingNudges)
        .where(
          and(eq(listingNudges.listingId, listingId), eq(listingNudges.code, codeRaw)),
        )
        .limit(1);
      if (any.length === 0) throw new NotFoundException('nudge not found');
    }
    return { ok: true as const, code: codeRaw };
  }

  /** Latest emission per code for cooldown (includes dismissed). */
  async loadHistory(listingId: string, now = new Date()): Promise<NudgeHistory> {
    const since = new Date(
      now.getTime() - DEFAULT_NUDGE_CONFIG.cooldownDays * 86_400_000,
    );
    const rows = await this.db
      .select({
        code: listingNudges.code,
        emittedAt: listingNudges.emittedAt,
      })
      .from(listingNudges)
      .where(
        and(eq(listingNudges.listingId, listingId), gte(listingNudges.emittedAt, since)),
      )
      .orderBy(desc(listingNudges.emittedAt));

    const m = new Map<NudgeCode, Date>();
    for (const r of rows) {
      if (!isNudgeCode(r.code)) continue;
      if (!m.has(r.code)) m.set(r.code, r.emittedAt);
    }
    return m;
  }

  /**
   * Metrics for evaluateNudges. Views from `listing_analytics_daily` when T23
   * migration is present; otherwise 0 (missing table → fail-soft skip view codes
   * only when we cannot read — treat as 0 views after successful empty sum).
   */
  async loadMetrics(listingId: string, now = new Date()): Promise<ListingMetrics | null> {
    const rows = await this.db
      .select({
        status: listings.status,
        firstPublishedAt: listings.firstPublishedAt,
        publishedAt: listings.publishedAt,
        unpublishedAt: listings.unpublishedAt,
        price: listings.price,
        sizeSqm: listings.sizeSqm,
        propertyType: listings.propertyType,
        condition: listings.condition,
        attributes: listings.attributes,
      })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    const listing = rows[0];
    if (!listing) return null;

    const rec = listingToPublishRecord(listing);
    const dom = daysOnMarket(rec, now);
    if (dom == null) return null;

    const windowDays = 30;
    const since = new Date(now.getTime() - windowDays * 86_400_000);
    const enquiryRows = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(enquiries)
      .where(and(eq(enquiries.listingId, listingId), gte(enquiries.createdAt, since)));
    const enquiryCount = Number(enquiryRows[0]?.total ?? 0);

    // Views MUST come from T23 rollups via SellerAnalyticsService (no direct SQL).
    const views =
      (await this.analytics.sumViewsInWindowFailSoft(listingId, windowDays, now)) ?? 0;
    const pricePct = await this.resolvePriceVsOmi(listing);

    const metrics: ListingMetrics = {
      daysOnMarket: dom,
      views30d: views,
      enquiries30d: enquiryCount,
    };
    if (pricePct != null) metrics.priceVsOmiBandPct = pricePct;
    // zoneMedianDaysOnMarket omitted until a zone median source exists (T23).
    return metrics;
  }

  /** Emit codes for one listing. Idempotent same UTC day. */
  async evaluateAndPersist(listingId: string, now = new Date()): Promise<NudgeCode[]> {
    const metrics = await this.loadMetrics(listingId, now);
    if (!metrics) return [];
    const history = await this.loadHistory(listingId, now);
    const nudges = evaluateNudges(metrics, history, now);
    const emitted: NudgeCode[] = [];
    for (const n of nudges) {
      const inserted = await this.emitIfNewToday(listingId, n, now);
      if (inserted) emitted.push(n.code);
    }
    return emitted;
  }

  async listActivePublishedListingIds(): Promise<string[]> {
    const rows = await this.db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.status, 'published'));
    return rows.map((r) => r.id);
  }

  private async emitIfNewToday(
    listingId: string,
    nudge: Nudge,
    now: Date,
  ): Promise<boolean> {
    const day = utcDayString(now);
    const dayStart = new Date(`${day}T00:00:00.000Z`);
    const existing = await this.db
      .select({ code: listingNudges.code })
      .from(listingNudges)
      .where(
        and(
          eq(listingNudges.listingId, listingId),
          eq(listingNudges.code, nudge.code),
          gte(listingNudges.emittedAt, dayStart),
        ),
      )
      .limit(1);
    if (existing.length > 0) return false;

    await this.db.insert(listingNudges).values({
      listingId,
      code: nudge.code,
      emittedAt: now,
      payload: nudge.data,
    });
    return true;
  }

  private async resolvePriceVsOmi(listing: {
    price: string | null;
    sizeSqm: string | null;
    propertyType: string | null;
    condition: string | null;
    attributes: unknown;
  }): Promise<number | null> {
    const price = asNumber(listing.price);
    const sizeSqm = asNumber(listing.sizeSqm);
    if (price == null || sizeSqm == null || !(price > 0) || !(sizeSqm > 0)) {
      return null;
    }
    const zoneId = readOmiZoneId(listing.attributes);
    if (!zoneId) return null;
    const propertyType = listing.propertyType?.trim() || 'appartamento';
    const band = await this.omiBand.bandForZone({
      zoneId,
      propertyType,
      condition: listing.condition,
    });
    if (!band) return null;
    const pos = positionAskingOnBand(price, sizeSqm, band);
    return pos ? pos.deviationPct : null;
  }
}
