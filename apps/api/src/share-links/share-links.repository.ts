import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings, shareLinks, users } from '../db/schema';
import type { AgentSnapshot } from './domain/types';

@Injectable()
export class ShareLinksRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async insertLink(input: {
    token: string;
    listingId: string;
    createdBy: string;
    agentSnapshot: AgentSnapshot;
    includeValuationBand: boolean;
  }) {
    const rows = await this.db
      .insert(shareLinks)
      .values({
        token: input.token,
        listingId: input.listingId,
        createdBy: input.createdBy,
        agentSnapshot: input.agentSnapshot,
        includeValuationBand: input.includeValuationBand,
      })
      .returning();
    return rows[0];
  }

  async findByToken(token: string) {
    const rows = await this.db.select().from(shareLinks).where(eq(shareLinks.token, token)).limit(1);
    return rows[0] ?? null;
  }

  async findById(id: string) {
    const rows = await this.db.select().from(shareLinks).where(eq(shareLinks.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async listForUser(userId: string) {
    return this.db
      .select({
        id: shareLinks.id,
        token: shareLinks.token,
        listingId: shareLinks.listingId,
        listingTitle: listings.title,
        listingSlug: listings.slug,
        includeValuationBand: shareLinks.includeValuationBand,
        viewCount: shareLinks.viewCount,
        uniqueViewCount: shareLinks.uniqueViewCount,
        lastViewedAt: shareLinks.lastViewedAt,
        createdAt: shareLinks.createdAt,
        revokedAt: shareLinks.revokedAt,
      })
      .from(shareLinks)
      .innerJoin(listings, eq(listings.id, shareLinks.listingId))
      .where(eq(shareLinks.createdBy, userId))
      .orderBy(desc(shareLinks.createdAt));
  }

  async revoke(id: string, userId: string) {
    const rows = await this.db
      .update(shareLinks)
      .set({ revokedAt: new Date() })
      .where(and(eq(shareLinks.id, id), eq(shareLinks.createdBy, userId), isNull(shareLinks.revokedAt)))
      .returning();
    return rows[0] ?? null;
  }

  async recordView(input: {
    shareLinkId: string;
    viewDate: string;
    visitorHash: string | null;
  }): Promise<{ viewCount: number; uniqueViewCount: number; uniqueAdded: boolean }> {
    return this.db.transaction(async (tx) => {
      let uniqueAdded = false;
      if (input.visitorHash) {
        const inserted = await tx.execute<{ share_link_id: string }>(sql`
          INSERT INTO share_link_view_dedup (share_link_id, view_date, visitor_hash)
          VALUES (${input.shareLinkId}::uuid, ${input.viewDate}::date, ${input.visitorHash})
          ON CONFLICT (share_link_id, view_date, visitor_hash) DO NOTHING
          RETURNING share_link_id
        `);
        uniqueAdded = (inserted.rows?.length ?? 0) > 0;
      }

      const bump = uniqueAdded ? 1 : 0;
      const rows = await tx
        .update(shareLinks)
        .set({
          viewCount: sql`${shareLinks.viewCount} + 1`,
          uniqueViewCount: sql`${shareLinks.uniqueViewCount} + ${bump}`,
          lastViewedAt: new Date(),
        })
        .where(eq(shareLinks.id, input.shareLinkId))
        .returning({
          viewCount: shareLinks.viewCount,
          uniqueViewCount: shareLinks.uniqueViewCount,
        });

      const row = rows[0];
      if (!row) throw new Error('share link missing during view record');
      return { ...row, uniqueAdded };
    });
  }

  async agentSnapshotForUser(userId: string): Promise<AgentSnapshot> {
    const rows = await this.db
      .select({
        displayName: users.displayName,
        phone: users.phone,
        bio: users.bio,
        slug: users.slug,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const row = rows[0];
    return {
      displayName: row?.displayName ?? null,
      phone: row?.phone ?? null,
      bio: row?.bio ?? null,
      slug: row?.slug ?? null,
    };
  }
}
