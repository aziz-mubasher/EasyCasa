import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, inArray, lt } from 'drizzle-orm';
import { addDays } from '@easycasa/shared';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import {
  analyticsDailyConversions,
  analyticsDailyDims,
  analyticsDailyFunnels,
  analyticsDailyPages,
  analyticsDailyProvinces,
  analyticsDailySources,
  analyticsDailyTotals,
  analyticsEvents,
  analyticsSalts,
  listingAnalyticsDaily,
  listings,
} from '../db/schema';
import { buildRollup, type RollupInputEvent } from './rollup-build';

@Injectable()
export class RollupService {
  private readonly log = new Logger(RollupService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
  ) {}

  async recompute(day: string): Promise<{ events: number; sessions: number }> {
    const rows = await this.db.select().from(analyticsEvents).where(eq(analyticsEvents.day, day));
    const entityIds = [...new Set(rows.map((r) => r.entityId).filter((id): id is string => Boolean(id)))];
    const provinceByListing = new Map<string, string>();
    if (entityIds.length > 0) {
      const found = await this.db
        .select({ id: listings.id, province: listings.province })
        .from(listings)
        .where(inArray(listings.id, entityIds));
      for (const row of found) {
        if (row.province) provinceByListing.set(row.id, row.province);
      }
    }
    const events: RollupInputEvent[] = rows.map((row) => ({
      ts: row.ts.getTime(),
      visitorHash: row.visitorHash,
      type: row.type as RollupInputEvent['type'],
      pathTemplate: row.pathTemplate,
      entityId: row.entityId,
      locale: row.locale,
      referrerHost: row.referrerHost,
      channel: row.channel,
      utmSource: row.utmSource,
      utmMedium: row.utmMedium,
      utmCampaign: row.utmCampaign,
      device: row.device,
      browser: row.browser,
      os: row.os,
      country: row.country,
      screenBucket: row.screenBucket,
      eventName: row.eventName,
      engagedMs: row.engagedMs,
      provincia:
        row.eventProps && typeof row.eventProps.provincia === 'string' ? row.eventProps.provincia : null,
    }));
    const built = buildRollup(events, provinceByListing);

    await this.db.transaction(async (tx) => {
      await tx.delete(analyticsDailyPages).where(eq(analyticsDailyPages.day, day));
      await tx.delete(analyticsDailySources).where(eq(analyticsDailySources.day, day));
      await tx.delete(analyticsDailyConversions).where(eq(analyticsDailyConversions.day, day));
      await tx.delete(analyticsDailyDims).where(eq(analyticsDailyDims.day, day));
      await tx.delete(analyticsDailyFunnels).where(eq(analyticsDailyFunnels.day, day));
      await tx.delete(analyticsDailyProvinces).where(eq(analyticsDailyProvinces.day, day));
      await tx.delete(analyticsDailyTotals).where(eq(analyticsDailyTotals.day, day));

      if (built.pages.length) {
        await tx.insert(analyticsDailyPages).values(built.pages.map((row) => ({ day, ...row })));
      }
      if (built.sources.length) {
        await tx.insert(analyticsDailySources).values(built.sources.map((row) => ({ day, ...row })));
      }
      if (built.conversions.length) {
        await tx.insert(analyticsDailyConversions).values(built.conversions.map((row) => ({ day, ...row })));
      }
      if (built.dims.length) {
        await tx.insert(analyticsDailyDims).values(built.dims.map((row) => ({ day, ...row })));
      }
      if (built.funnels.length) {
        await tx.insert(analyticsDailyFunnels).values(built.funnels.map((row) => ({ day, ...row })));
      }
      if (built.provinces.length) {
        await tx.insert(analyticsDailyProvinces).values(built.provinces.map((row) => ({ day, ...row })));
      }
      await tx.insert(analyticsDailyTotals).values({ day, ...built.totals });

      if (this.config.LISTING_VIEWS_FROM_WEB_ANALYTICS) {
        for (const item of built.listingViewCounts) {
          await tx
            .insert(listingAnalyticsDaily)
            .values({
              listingId: item.entityId,
              day,
              views: item.count,
              saves: 0,
              enquiries: 0,
            })
            .onConflictDoUpdate({
              target: [listingAnalyticsDaily.listingId, listingAnalyticsDaily.day],
              set: { views: item.count },
            });
        }
      }
    });

    this.log.log(`analytics rollup day=${day} events=${rows.length} sessions=${built.totals.sessions}`);
    return { events: rows.length, sessions: built.totals.sessions };
  }

  async retain(today: string): Promise<void> {
    const cutoff = addDays(today, -30);
    const salts = await this.db.delete(analyticsSalts).where(lt(analyticsSalts.day, today));
    const events = await this.db.delete(analyticsEvents).where(lt(analyticsEvents.day, cutoff));
    this.log.log(
      `analytics retention salts=${rowCount(salts)} events=${rowCount(events)} cutoff=${cutoff}`,
    );
  }
}

function rowCount(result: unknown): number {
  if (result && typeof result === 'object' && 'rowCount' in result) {
    const n = (result as { rowCount?: number | null }).rowCount;
    return n ?? 0;
  }
  return 0;
}
