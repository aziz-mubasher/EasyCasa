import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { users, favorites, savedSearches, devices, listings } from '../db/schema';
import type { AuthUser } from '../auth/auth.types';
import type { ListingSummary } from '@easycasa/shared';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** Resolve the internal user for an authenticated principal, creating on first sight.
   *  We store the OIDC subject in the slug field's absence via email match; here we
   *  key on email when present, else create a minimal record. */
  async getOrCreate(user: AuthUser) {
    if (user.email) {
      const existing = await this.db.select().from(users).where(eq(users.email, user.email)).limit(1);
      if (existing[0]) return existing[0];
    }
    const role = user.roles.includes('agent') ? 'agent' : 'buyer';
    const inserted = await this.db
      .insert(users)
      .values({ email: user.email, displayName: user.name, role })
      .returning();
    return inserted[0];
  }

  async getBySlug(slug: string) {
    const rows = await this.db.select().from(users).where(eq(users.slug, slug)).limit(1);
    if (!rows[0]) throw new NotFoundException('agent not found');
    return rows[0];
  }

  async addFavorite(userId: string, listingId: string) {
    await this.db
      .insert(favorites)
      .values({ userId, listingId })
      .onConflictDoNothing();
    return { ok: true as const };
  }

  async removeFavorite(userId: string, listingId: string) {
    await this.db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)));
    return { ok: true as const };
  }

  /** Favorite listings as ListingSummary rows (for mobile/web clients). */
  async listFavorites(userId: string): Promise<ListingSummary[]> {
    const rows = await this.db
      .select({
        id: listings.id,
        slug: listings.slug,
        title: listings.title,
        price: listings.price,
        currency: listings.currency,
        transactionType: listings.transactionType,
        bedrooms: listings.bedrooms,
        bathrooms: listings.bathrooms,
        sizeSqm: listings.sizeSqm,
        city: listings.city,
        latitude: listings.latitude,
        longitude: listings.longitude,
        status: listings.status,
        coverUrl: sql<string | null>`(SELECT url FROM media m WHERE m.listing_id = listings.id ORDER BY m.position LIMIT 1)`,
      })
      .from(favorites)
      .innerJoin(listings, eq(favorites.listingId, listings.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug ?? r.id,
      title: r.title,
      price: r.price == null ? null : Number(r.price),
      currency: r.currency,
      transactionType: r.transactionType,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      sizeSqm: r.sizeSqm == null ? null : Number(r.sizeSqm),
      city: r.city,
      latitude: r.latitude,
      longitude: r.longitude,
      status: r.status,
      coverUrl: r.coverUrl ?? null,
    }));
  }

  createSavedSearch(userId: string, name: string, query: unknown) {
    return this.db
      .insert(savedSearches)
      .values({ userId, name, query: query as object })
      .returning();
  }

  listSavedSearches(userId: string) {
    return this.db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.createdAt));
  }

  async registerDevice(
    userId: string,
    input: { token: string; platform: 'ios' | 'android' | 'web'; locale: string },
  ) {
    await this.db
      .insert(devices)
      .values({
        userId,
        token: input.token,
        platform: input.platform,
        locale: input.locale || 'it',
      })
      .onConflictDoUpdate({
        target: [devices.userId, devices.token],
        set: {
          platform: input.platform,
          locale: input.locale || 'it',
          updatedAt: new Date(),
        },
      });
    return { ok: true as const };
  }
}
