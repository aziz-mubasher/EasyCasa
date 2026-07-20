import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { listingRowToPin } from '../../alerts/listing-pin';
import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { listings, users } from '../../db/schema';
import { SEARCH_INDEX, type SearchIndexPort } from '../../search/domain/ports';
import {
  type ListingSink,
  type PilotListing,
  wpKeyToPostId,
} from './seed';

export const PILOT_OWNER_EMAIL = 'agente@easycasaita.com';

/**
 * Drizzle + Meili sink for pilot listings — upsert on synthetic wp_post_id.
 */
@Injectable()
export class DrizzleListingSink implements ListingSink {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(SEARCH_INDEX) private readonly index: SearchIndexPort,
  ) {}

  async upsertByWpKey(listing: PilotListing): Promise<void> {
    const ownerId = await this.ensurePilotOwner();
    const wpPostId = wpKeyToPostId(listing.wpKey);
    const values = {
      wpPostId,
      slug: listing.slug,
      title: listing.title,
      description: `${listing.title} — ${listing.address}`,
      status: 'published' as const,
      transactionType: listing.kind,
      price: String(listing.priceEur),
      currency: 'EUR',
      bedrooms: listing.rooms,
      rooms: listing.rooms,
      sizeSqm: String(listing.sqm),
      energyClass: listing.energyClass === 'A' ? 'A1' : listing.energyClass,
      propertyType: 'apartment',
      address: listing.address,
      city: listing.city,
      latitude: listing.lat,
      longitude: listing.lng,
      ownerUserId: ownerId,
      agentId: ownerId,
      source: 'pilot',
      publishedAt: new Date(),
      updatedAt: new Date(),
    };

    const [row] = await this.db
      .insert(listings)
      .values(values)
      .onConflictDoUpdate({
        target: listings.wpPostId,
        set: {
          slug: values.slug,
          title: values.title,
          description: values.description,
          status: values.status,
          transactionType: values.transactionType,
          price: values.price,
          bedrooms: values.bedrooms,
          rooms: values.rooms,
          sizeSqm: values.sizeSqm,
          energyClass: values.energyClass,
          address: values.address,
          city: values.city,
          latitude: values.latitude,
          longitude: values.longitude,
          ownerUserId: values.ownerUserId,
          agentId: values.agentId,
          source: values.source,
          publishedAt: values.publishedAt,
          updatedAt: values.updatedAt,
        },
      })
      .returning();

    const pin = listingRowToPin({
      id: row.id,
      title: row.title,
      latitude: row.latitude,
      longitude: row.longitude,
      price: row.price,
      transactionType: row.transactionType,
      bedrooms: row.bedrooms,
      rooms: row.rooms,
      sizeSqm: row.sizeSqm,
      energyClass: row.energyClass,
      propertyType: row.propertyType,
    });
    if (pin) await this.index.upsert(pin);
  }

  async countByWpKeyPrefix(prefix: string): Promise<number> {
    void prefix;
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(listings)
      .where(eq(listings.source, 'pilot'));
    return rows[0]?.n ?? 0;
  }

  private async ensurePilotOwner(): Promise<string> {
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, PILOT_OWNER_EMAIL))
      .limit(1);
    if (existing[0]) return existing[0].id;
    const [created] = await this.db
      .insert(users)
      .values({
        email: PILOT_OWNER_EMAIL,
        displayName: 'Agenzia EasyCasa',
        role: 'agent',
        slug: 'agenzia-easycasa-pilot',
      })
      .returning({ id: users.id });
    return created.id;
  }
}
