import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import {
  BOOST_WEIGHT_ACTIVE,
  clampBoostWeight,
  isBoostActive,
  remainingBoostMs,
  resumeBoostEndsAt,
} from '@easycasa/shared';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listingBoost, listings } from '../db/schema';

@Injectable()
export class ListingBoostService {
  private readonly logger = new Logger(ListingBoostService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async activateFromPayment(opts: {
    listingId: string;
    days: number;
    paymentRef: string;
    now?: Date;
  }) {
    const now = opts.now ?? new Date();
    const endsAt = new Date(now.getTime() + opts.days * 86_400_000);
    const [row] = await this.db
      .insert(listingBoost)
      .values({
        listingId: opts.listingId,
        startsAt: now,
        endsAt,
        stripePaymentRef: opts.paymentRef,
        status: 'active',
      })
      .returning();
    await this.db
      .update(listings)
      .set({ featuredUntil: endsAt })
      .where(eq(listings.id, opts.listingId));
    return row;
  }

  async cancelByPaymentRef(paymentRef: string, now = new Date()) {
    const updated = await this.db
      .update(listingBoost)
      .set({ status: 'cancelled', endsAt: now, remainingMs: 0 })
      .where(
        and(
          eq(listingBoost.stripePaymentRef, paymentRef),
          inArray(listingBoost.status, ['active', 'paused']),
        ),
      )
      .returning({ listingId: listingBoost.listingId });
    return updated.map((r) => r.listingId);
  }

  async pauseForListing(listingId: string, now = new Date()) {
    const rows = await this.db
      .select()
      .from(listingBoost)
      .where(and(eq(listingBoost.listingId, listingId), eq(listingBoost.status, 'active')));
    for (const row of rows) {
      if (!isBoostActive({ status: row.status, startsAt: row.startsAt, endsAt: row.endsAt, now })) {
        continue;
      }
      const remaining = remainingBoostMs(row.endsAt, now);
      await this.db
        .update(listingBoost)
        .set({
          status: 'paused',
          pausedAt: now,
          remainingMs: remaining,
        })
        .where(eq(listingBoost.id, row.id));
    }
  }

  async resumeForListing(listingId: string, now = new Date()) {
    const rows = await this.db
      .select()
      .from(listingBoost)
      .where(and(eq(listingBoost.listingId, listingId), eq(listingBoost.status, 'paused')));
    for (const row of rows) {
      const remaining = Number(row.remainingMs ?? 0);
      if (remaining <= 0) {
        await this.db
          .update(listingBoost)
          .set({ status: 'expired', remainingMs: 0 })
          .where(eq(listingBoost.id, row.id));
        continue;
      }
      const endsAt = resumeBoostEndsAt(remaining, now);
      await this.db
        .update(listingBoost)
        .set({
          status: 'active',
          startsAt: now,
          endsAt,
          pausedAt: null,
          remainingMs: null,
        })
        .where(eq(listingBoost.id, row.id));
      await this.db
        .update(listings)
        .set({ featuredUntil: endsAt })
        .where(eq(listings.id, listingId));
    }
  }

  /** Expire ended active rows; return listing ids that need reindex. */
  async expireEnded(now = new Date()): Promise<string[]> {
    const updated = await this.db
      .update(listingBoost)
      .set({ status: 'expired' })
      .where(and(eq(listingBoost.status, 'active'), lt(listingBoost.endsAt, now)))
      .returning({ listingId: listingBoost.listingId });
    return [...new Set(updated.map((r) => r.listingId))];
  }

  async boostWeightForListing(listingId: string, now = new Date()): Promise<number> {
    // Lazy expiry so ranking drops without @nestjs/schedule (repo has no Cron package).
    await this.expireEnded(now);
    const rows = await this.db
      .select()
      .from(listingBoost)
      .where(and(eq(listingBoost.listingId, listingId), eq(listingBoost.status, 'active')))
      .limit(5);
    for (const row of rows) {
      if (isBoostActive({ status: row.status, startsAt: row.startsAt, endsAt: row.endsAt, now })) {
        return clampBoostWeight(BOOST_WEIGHT_ACTIVE);
      }
    }
    return 0;
  }

  async isListingBoosted(listingId: string, now = new Date()): Promise<boolean> {
    return (await this.boostWeightForListing(listingId, now)) > 0;
  }

  async boostedListingIds(ids: string[], now = new Date()): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.db
      .select({
        listingId: listingBoost.listingId,
        status: listingBoost.status,
        startsAt: listingBoost.startsAt,
        endsAt: listingBoost.endsAt,
      })
      .from(listingBoost)
      .where(
        and(
          inArray(listingBoost.listingId, ids),
          eq(listingBoost.status, 'active'),
          sql`${listingBoost.startsAt} <= ${now}`,
          sql`${listingBoost.endsAt} > ${now}`,
        ),
      );
    return new Set(rows.map((r) => r.listingId));
  }
}
