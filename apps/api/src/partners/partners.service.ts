import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { leads, payouts, partnerProfiles, listings } from '../db/schema';
import { scoreLead, hasContactIntent, type LeadSignals } from './lead-score';

@Injectable()
export class PartnersService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** Route a new lead to a partner covering the listing's region (commission-free model:
   *  serious leads go to partners). Returns the created lead id or null. */
  async routeLead(listingId: string, buyerId: string | null, message: string, buyerHasHistory: boolean) {
    const listingRows = await this.db
      .select({ regionId: listings.regionId, price: listings.price })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    const listing = listingRows[0];

    // pick a partner whose regions cover this listing's region (by slug)
    const partner = await this.db.execute(sql`
      SELECT pp.user_id AS id
        FROM partner_profiles pp
        JOIN regions r ON r.slug = ANY(pp.regions)
       WHERE r.id = ${listing?.regionId ?? null}
       ORDER BY random()
       LIMIT 1
    `);
    const partnerId = (partner.rows[0] as { id?: string } | undefined)?.id ?? null;

    const signals: LeadSignals = {
      messageLength: message.length,
      hasContactIntent: hasContactIntent(message),
      buyerHasHistory,
      priceKnown: listing?.price != null,
    };
    const rows = await this.db
      .insert(leads)
      .values({ listingId, buyerId, partnerId, score: scoreLead(signals), source: 'message', status: 'new' })
      .returning();
    return rows[0] ?? null;
  }

  async dashboard(partnerUserId: string) {
    const byStatus = await this.db
      .select({ status: leads.status, n: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.partnerId, partnerUserId))
      .groupBy(leads.status);
    const won = byStatus.find((r) => r.status === 'won')?.n ?? 0;
    const total = byStatus.reduce((a, r) => a + r.n, 0);
    return { leadsByStatus: byStatus, conversionRate: total ? won / total : 0 };
  }

  listLeads(partnerUserId: string) {
    return this.db
      .select()
      .from(leads)
      .where(eq(leads.partnerId, partnerUserId))
      .orderBy(desc(leads.score), desc(leads.createdAt))
      .limit(100);
  }

  updateLeadStatus(partnerUserId: string, leadId: string, status: string) {
    return this.db
      .update(leads)
      .set({ status })
      .where(and(eq(leads.id, leadId), eq(leads.partnerId, partnerUserId)))
      .returning();
  }

  listPayouts(partnerUserId: string) {
    return this.db
      .select()
      .from(payouts)
      .where(eq(payouts.partnerId, partnerUserId))
      .orderBy(desc(payouts.createdAt));
  }

  upsertProfile(userId: string, company: string | undefined, tier: string, regions: string[]) {
    return this.db
      .insert(partnerProfiles)
      .values({ userId, company, tier, regions })
      .onConflictDoNothing()
      .returning();
  }
}
