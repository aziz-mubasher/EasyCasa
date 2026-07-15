import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { users, favorites, savedSearches } from '../db/schema';
import type { AuthUser } from '../auth/auth.types';

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
    return { ok: true };
  }

  async removeFavorite(userId: string, listingId: string) {
    await this.db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)));
    return { ok: true };
  }

  listFavorites(userId: string) {
    return this.db.select().from(favorites).where(eq(favorites.userId, userId));
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
}
