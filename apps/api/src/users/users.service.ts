import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { users, favorites, devices, listings, credentials, professionals } from '../db/schema';
import type { AuthUser } from '../auth/auth.types';
import type { ListingSummary } from '@easycasa/shared';
import {
  credentialAllowsPublicPhone,
  publicPhone,
  publicSlug,
  type PublicAgentContact,
} from '../listings/domain/public-contact';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** Stable slug for OIDC-only principals (buyers without a public agent slug). */
  private oidcSlug(sub: string): string {
    return `oidc:${sub}`;
  }

  /** Resolve the internal user for an authenticated principal, creating on first sight.
   *  Match email when present, else match OIDC `sub` via internal `oidc:{sub}` slug so
   *  consent + enquiry calls in the same session map to one ledger subject. */
  async getOrCreate(user: AuthUser) {
    if (user.email) {
      const existing = await this.db.select().from(users).where(eq(users.email, user.email)).limit(1);
      if (existing[0]) return existing[0];
    }
    const subSlug = this.oidcSlug(user.sub);
    const bySub = await this.db.select().from(users).where(eq(users.slug, subSlug)).limit(1);
    if (bySub[0]) return bySub[0];

    const role = user.roles.includes('admin')
      ? 'admin'
      : user.roles.includes('professional')
        ? 'professional'
        : user.roles.includes('agent')
          ? 'agent'
          : user.roles.includes('seller') ||
              user.roles.includes('partner') ||
              user.roles.includes('pro_marketer')
            ? 'seller'
            : 'buyer';
    const inserted = await this.db
      .insert(users)
      .values({ email: user.email, displayName: user.name, role, slug: subSlug })
      .returning();
    return inserted[0];
  }

  /**
   * Public agent card. Phone only with a verified REA. Email, phoneE164, and
   * the internal id never leave this method.
   */
  async getBySlug(slug: string): Promise<{
    displayName: string | null;
    phone: string | null;
    bio: string | null;
    avatarUrl: string | null;
    slug: string | null;
  }> {
    if (!slug || slug.startsWith('oidc:')) throw new NotFoundException('agent not found');
    const rows = await this.db.select().from(users).where(eq(users.slug, slug)).limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('agent not found');
    const contact = await this.publicContactFor(row.id);
    return {
      displayName: contact?.displayName ?? null,
      phone: contact?.phone ?? null,
      bio: contact?.bio ?? null,
      avatarUrl: contact?.avatarUrl ?? null,
      slug: contact?.slug ?? null,
    };
  }

  /** Credential-gated public contact for one user. Null when the user is missing. */
  async publicContactFor(userId: string, now = new Date()): Promise<PublicAgentContact | null> {
    const row = await this.findById(userId);
    if (!row) return null;
    const creds = await this.db
      .select({
        type: credentials.type,
        status: credentials.status,
        expiresAt: credentials.expiresAt,
      })
      .from(credentials)
      .innerJoin(professionals, eq(credentials.professionalId, professionals.id))
      .where(eq(professionals.userId, userId));
    return {
      id: row.id,
      displayName: row.displayName ?? null,
      phone: publicPhone(row.phone, credentialAllowsPublicPhone(creds, now)),
      slug: publicSlug(row.slug),
      bio: row.bio ?? null,
      avatarUrl: row.avatarUrl ?? null,
    };
  }

  async findById(id: string) {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }

  /** EC-S-T19.2 — true when admin suspend is active. */
  isSuspended(row: { suspendedAt: Date | null } | null | undefined): boolean {
    return row?.suspendedAt != null;
  }

  async assertNotSuspended(userId: string): Promise<void> {
    const row = await this.findById(userId);
    if (this.isSuspended(row)) {
      throw new ForbiddenException('account suspended');
    }
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
