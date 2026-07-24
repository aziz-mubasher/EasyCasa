import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings, shareLinkVisitorHashes, shareLinks, users } from '../db/schema';
import type { AgentSnapshot } from './domain/public-payload';

export type ShareLinkRow = typeof shareLinks.$inferSelect;

@Injectable()
export class ShareLinksRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findByToken(token: string): Promise<ShareLinkRow | null> {
    const rows = await this.db.select().from(shareLinks).where(eq(shareLinks.token, token)).limit(1);
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<ShareLinkRow | null> {
    const rows = await this.db.select().from(shareLinks).where(eq(shareLinks.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async insertLink(values: typeof shareLinks.$inferInsert): Promise<ShareLinkRow> {
    const rows = await this.db.insert(shareLinks).values(values).returning();
    return rows[0];
  }

  async listForUser(userId: string, listingId?: string): Promise<ShareLinkRow[]> {
    const conds = [eq(shareLinks.createdBy, userId), isNull(shareLinks.revokedAt)];
    if (listingId) conds.push(eq(shareLinks.listingId, listingId));
    return this.db
      .select()
      .from(shareLinks)
      .where(and(...conds))
      .orderBy(desc(shareLinks.createdAt));
  }

  async revoke(id: string, userId: string): Promise<ShareLinkRow | null> {
    const rows = await this.db
      .update(shareLinks)
      .set({ revokedAt: new Date() })
      .where(and(eq(shareLinks.id, id), eq(shareLinks.createdBy, userId), isNull(shareLinks.revokedAt)))
      .returning();
    return rows[0] ?? null;
  }

  async listingForShare(listingId: string) {
    const rows = await this.db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
    return rows[0] ?? null;
  }

  async agentSnapshot(agentUserId: string): Promise<AgentSnapshot> {
    const rows = await this.db
      .select({
        displayName: users.displayName,
        phone: users.phone,
        slug: users.slug,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, agentUserId))
      .limit(1);
    const u = rows[0];
    return {
      displayName: u?.displayName ?? 'Easy Casa Italy',
      phone: u?.phone ?? null,
      slug: u?.slug ?? null,
      bio: u?.bio ?? null,
      avatarUrl: u?.avatarUrl ?? null,
    };
  }

  async recordView(shareLinkId: string, visitorHash: string): Promise<{ uniqueAdded: boolean }> {
    return this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(shareLinkVisitorHashes)
        .values({ shareLinkId, visitorHash })
        .onConflictDoNothing()
        .returning({ visitorHash: shareLinkVisitorHashes.visitorHash });

      const uniqueAdded = inserted.length > 0;

      await tx
        .update(shareLinks)
        .set({
          viewCount: sql`${shareLinks.viewCount} + 1`,
          uniqueViewCount: uniqueAdded
            ? sql`${shareLinks.uniqueViewCount} + 1`
            : shareLinks.uniqueViewCount,
          lastViewedAt: new Date(),
        })
        .where(eq(shareLinks.id, shareLinkId));

      return { uniqueAdded };
    });
  }
}
