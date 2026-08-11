import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import {
  DEFAULT_NUDGE_CONFIG,
  evaluateNudges,
  isNudgeCode,
  type NudgeCode,
  type NudgeHistoryEntry,
  type NudgeMetrics,
  daysOnMarket,
} from '@easycasa/shared';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { enquiries, listingNudges, listings } from '../db/schema';
import { listingToPublishRecord } from '../listings/listing-trust';
import {
  OmiBandService,
  positionAskingOnBand,
} from '../omi/omi-band.service';

const log = new Logger('SellerNudges');

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

  /**
   * Active (non-dismissed) nudges for the seller UI — latest emission per code.
   */
  async listActive(actorUserId: string, listingId: string) {
    await this.assertOwner(actorUserId, listingId);
    const rows = await this.db
      .select({
        code: listingNudges.code,
        emittedAt: listingNudges.emittedAt,
        dismissedAt: listingNudges.dismissedAt,
      })
      .from(listingNudges)
      .where(
        and(eq(listingNudges.listingId, listingId), isNull(listingNudges.dismissedAt)),
      )
      .orderBy(desc(listingNudges.emittedAt));

    const seen = new Set<string>();
    const items: Array<{ code: NudgeCode; emittedAt: string }> = [];
    for (const r of rows) {
      if (!isNudgeCode(r.code)) continue;
      if (seen.has(r.code)) continue;
      seen.add(r.code);
      items.push({ code: r.code, emittedAt: r.emittedAt.toISOString() });
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
      // Idempotent dismiss: already dismissed or never emitted → 404 only if never emitted.
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

  /** History window for cool-down evaluation (includes dismissed rows). */
  async loadHistory(listingId: string, now = new Date()): Promise<NudgeHistoryEntry[]> {
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
      );
    const out: NudgeHistoryEntry[] = [];
    for (const r of rows) {
      if (!isNudgeCode(r.code)) continue;
      out.push({ code: r.code, emittedAt: r.emittedAt });
    }
    return out;
  }

  /**
   * Build metrics without requiring the unfinished T23 HTTP endpoint.
   * Views come from `listing_analytics_daily` when T23 migration is present;
   * otherwise views stay null (missing-data safety skips view-based codes).
   */
  async loadMetrics(listingId: string, now = new Date()): Promise<NudgeMetrics> {
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
    if (!listing) {
      return {
        views: null,
        enquiryRate: null,
        daysOnMarket: null,
        priceVsOmiBandPct: null,
      };
    }

    const rec = listingToPublishRecord(listing);
    const dom = daysOnMarket(rec, now);

    const windowDays = 30;
    const since = new Date(now.getTime() - windowDays * 86_400_000);
    const enquiryRows = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(enquiries)
      .where(and(eq(enquiries.listingId, listingId), gte(enquiries.createdAt, since)));
    const enquiryCount = Number(enquiryRows[0]?.total ?? 0);

    const views = await this.sumViewsFailSoft(listingId, windowDays, now);
    const enquiryRate =
      views == null ? null : views > 0 ? enquiryCount / views : enquiryCount > 0 ? 1 : 0;

    const pricePct = await this.resolvePriceVsOmi(listing);

    return {
      views,
      enquiryRate,
      daysOnMarket: dom,
      priceVsOmiBandPct: pricePct,
    };
  }

  /**
   * Emit codes for one listing. Idempotent same UTC day: no duplicate
   * (listing_id, code) on the same calendar day.
   */
  async evaluateAndPersist(listingId: string, now = new Date()): Promise<NudgeCode[]> {
    const metrics = await this.loadMetrics(listingId, now);
    const history = await this.loadHistory(listingId, now);
    const codes = evaluateNudges(metrics, history, now);
    const emitted: NudgeCode[] = [];
    for (const code of codes) {
      const inserted = await this.emitIfNewToday(listingId, code, now);
      if (inserted) emitted.push(code);
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
    code: NudgeCode,
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
          eq(listingNudges.code, code),
          gte(listingNudges.emittedAt, dayStart),
        ),
      )
      .limit(1);
    if (existing.length > 0) return false;

    await this.db.insert(listingNudges).values({
      listingId,
      code,
      emittedAt: now,
    });
    return true;
  }

  private async sumViewsFailSoft(
    listingId: string,
    windowDays: number,
    now: Date,
  ): Promise<number | null> {
    // T23 table `listing_analytics_daily` — absent until 0057 lands.
    try {
      const endDay = utcDayString(now);
      const end = new Date(`${endDay}T00:00:00.000Z`);
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - (windowDays - 1));
      const startDay = utcDayString(start);
      const result = await this.db.execute(sql`
        SELECT COALESCE(SUM(views), 0)::int AS total
        FROM listing_analytics_daily
        WHERE listing_id = ${listingId}::uuid
          AND day >= ${startDay}::date
          AND day <= ${endDay}::date
      `);
      const row = (result as unknown as { rows: Array<{ total: number | string }> })
        .rows[0];
      if (!row) return 0;
      return Number(row.total ?? 0);
    } catch (err) {
      log.debug(
        `views unavailable for ${listingId} (T23 table?): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
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
