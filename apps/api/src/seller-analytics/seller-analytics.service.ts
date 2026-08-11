import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte, lte, sql, sum } from 'drizzle-orm';
import {
  buildSellerListingAnalytics,
  clampAnalyticsWindow,
  daysOnMarket,
  parseAnalyticsWindow,
  utcDayString,
  windowDayCount,
  windowStartDate,
  type SellerListingAnalytics,
} from '@easycasa/shared';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import {
  enquiries,
  favorites,
  listingAnalyticsDaily,
  listingDraft,
  listings,
} from '../db/schema';
import { listingToPublishRecord } from '../listings/listing-trust';
import {
  OmiBandService,
  positionAskingOnBand,
} from '../omi/omi-band.service';
import { SellerQuotaService } from '../seller-quota/seller-quota.service';

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

function readDraftOmiZoneId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const raw = (payload as Record<string, unknown>).omiZoneId;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

/**
 * Fail-soft view increment for public listing detail fetches.
 * Never throws — detail page must not break on analytics write failure.
 */
export async function recordListingView(
  db: Db,
  listingId: string,
  now = new Date(),
): Promise<void> {
  try {
    const day = utcDayString(now);
    await db
      .insert(listingAnalyticsDaily)
      .values({
        listingId,
        day,
        views: 1,
        saves: 0,
        enquiries: 0,
      })
      .onConflictDoUpdate({
        target: [listingAnalyticsDaily.listingId, listingAnalyticsDaily.day],
        set: {
          views: sql`${listingAnalyticsDaily.views} + 1`,
        },
      });
  } catch (err) {
    Logger.warn(
      `recordListingView failed for ${listingId}: ${err instanceof Error ? err.message : String(err)}`,
      'SellerAnalytics',
    );
  }
}

@Injectable()
export class SellerAnalyticsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly omiBand: OmiBandService,
    private readonly quota: SellerQuotaService,
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
    if (owner !== actorUserId) {
      throw new ForbiddenException('not your listing');
    }
    return row;
  }

  async getAnalytics(
    actorUserId: string,
    listingId: string,
    windowRaw: string | undefined,
    now = new Date(),
  ): Promise<SellerListingAnalytics> {
    const listing = await this.assertOwner(actorUserId, listingId);
    const { entitlements } = await this.quota.resolveEntitlements(actorUserId, now);
    const requested = parseAnalyticsWindow(windowRaw);
    const window = clampAnalyticsWindow(requested, entitlements.analyticsWindowDays);
    const days = windowDayCount(window);
    const endDay = utcDayString(now);
    const start = windowStartDate(endDay, days);
    const startDay = utcDayString(start);

    const [views, saves, enquiryCount, series, pricePct] = await Promise.all([
      this.sumViews(listingId, startDay, endDay),
      this.countSaves(listingId, start),
      this.countEnquiries(listingId, start),
      this.viewSeries(listingId, startDay, endDay),
      this.resolvePriceVsOmi(listing),
    ]);

    const rec = listingToPublishRecord(listing);
    const dom = daysOnMarket(rec, now) ?? 0;

    return buildSellerListingAnalytics({
      views,
      saves,
      enquiries: enquiryCount,
      daysOnMarket: dom,
      priceVsOmiBandPct: pricePct,
      // T23: no zone-median DOM data source — omit always (do not invent).
      zoneMedianDaysOnMarket: null,
      series,
    });
  }

  /**
   * Sum views from T23 `listing_analytics_daily` rollups for an inclusive
   * UTC window ending on `now`'s calendar day. Used by the seller dashboard
   * and by T24 nudges (inject this — do not re-query the rollup table).
   */
  async sumViewsInWindow(
    listingId: string,
    windowDays: number,
    now = new Date(),
  ): Promise<number> {
    const endDay = utcDayString(now);
    const start = windowStartDate(endDay, windowDays);
    const startDay = utcDayString(start);
    return this.sumViews(listingId, startDay, endDay);
  }

  /**
   * Fail-soft variant for background jobs: missing table / transient DB errors
   * return null so callers can skip view-dependent rules without aborting.
   */
  async sumViewsInWindowFailSoft(
    listingId: string,
    windowDays: number,
    now = new Date(),
  ): Promise<number | null> {
    try {
      return await this.sumViewsInWindow(listingId, windowDays, now);
    } catch (err) {
      Logger.debug(
        `views unavailable for ${listingId} (T23 table?): ${
          err instanceof Error ? err.message : String(err)
        }`,
        'SellerAnalytics',
      );
      return null;
    }
  }

  private async sumViews(
    listingId: string,
    startDay: string,
    endDay: string,
  ): Promise<number> {
    const rows = await this.db
      .select({ total: sum(listingAnalyticsDaily.views) })
      .from(listingAnalyticsDaily)
      .where(
        and(
          eq(listingAnalyticsDaily.listingId, listingId),
          gte(listingAnalyticsDaily.day, startDay),
          lte(listingAnalyticsDaily.day, endDay),
        ),
      );
    return Number(rows[0]?.total ?? 0);
  }

  private async countSaves(listingId: string, since: Date): Promise<number> {
    const rows = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(favorites)
      .where(
        and(eq(favorites.listingId, listingId), gte(favorites.createdAt, since)),
      );
    return Number(rows[0]?.total ?? 0);
  }

  private async countEnquiries(listingId: string, since: Date): Promise<number> {
    const rows = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(enquiries)
      .where(
        and(eq(enquiries.listingId, listingId), gte(enquiries.createdAt, since)),
      );
    return Number(rows[0]?.total ?? 0);
  }

  private async viewSeries(
    listingId: string,
    startDay: string,
    endDay: string,
  ): Promise<Array<{ day: string; views: number }>> {
    const rows = await this.db
      .select({
        day: listingAnalyticsDaily.day,
        views: listingAnalyticsDaily.views,
      })
      .from(listingAnalyticsDaily)
      .where(
        and(
          eq(listingAnalyticsDaily.listingId, listingId),
          gte(listingAnalyticsDaily.day, startDay),
          lte(listingAnalyticsDaily.day, endDay),
        ),
      )
      .orderBy(listingAnalyticsDaily.day);
    return rows.map((r) => ({ day: r.day, views: r.views }));
  }

  private async resolvePriceVsOmi(listing: {
    price: string | null;
    sizeSqm: string | null;
    propertyType: string | null;
    condition: string | null;
    attributes: unknown;
    ownerUserId: string | null;
    agentId: string | null;
  }): Promise<number | null> {
    const price = asNumber(listing.price);
    const sizeSqm = asNumber(listing.sizeSqm);
    if (price == null || sizeSqm == null || !(price > 0) || !(sizeSqm > 0)) {
      return null;
    }

    let zoneId = readOmiZoneId(listing.attributes);
    if (!zoneId) {
      zoneId = await this.lookupDraftZone(
        listing.ownerUserId ?? listing.agentId,
      );
    }
    if (!zoneId) return null;
    if (!listing.propertyType?.trim()) return null;

    const band = await this.omiBand.bandForZone({
      zoneId,
      propertyType: listing.propertyType.trim(),
      condition: listing.condition,
    });
    if (!band) return null;

    const pos = positionAskingOnBand(price, sizeSqm, band);
    return pos ? pos.deviationPct : null;
  }

  private async lookupDraftZone(sellerId: string | null): Promise<string | null> {
    if (!sellerId) return null;
    const rows = await this.db
      .select({ payload: listingDraft.payload })
      .from(listingDraft)
      .where(eq(listingDraft.sellerId, sellerId))
      .orderBy(desc(listingDraft.updatedAt))
      .limit(5);
    for (const row of rows) {
      const z = readDraftOmiZoneId(row.payload);
      if (z) return z;
    }
    return null;
  }
}
