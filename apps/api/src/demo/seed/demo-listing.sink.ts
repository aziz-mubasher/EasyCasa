import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { listingRowToPin } from '../../alerts/listing-pin';
import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { listings, users } from '../../db/schema';
import { SEARCH_INDEX, type SearchIndexPort } from '../../search/domain/ports';
import type { DemoListingSeed } from './generate-listings';

export const DEMO_OWNER_EMAIL = 'demo-owner@easycasaita.com';

/** Stable negative wp_post_id space for demo rows (avoids WP / pilot collisions). */
export function demoWpPostId(wpKey: string): number {
  let h = 0;
  for (let i = 0; i < wpKey.length; i++) h = (Math.imul(31, h) + wpKey.charCodeAt(i)) | 0;
  const n = Math.abs(h) % 900_000_000;
  return -(1_100_000_000 + n);
}

@Injectable()
export class DemoListingSink {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(SEARCH_INDEX) private readonly index: SearchIndexPort,
  ) {}

  async ensureDemoOwner(): Promise<string> {
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, DEMO_OWNER_EMAIL))
      .limit(1);
    if (existing[0]?.id) {
      await this.db
        .update(users)
        .set({
          identityVerifiedAt: new Date('2026-01-15T10:00:00Z'),
          identityMethod: 'spid',
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing[0].id));
      return existing[0].id;
    }
    const [row] = await this.db
      .insert(users)
      .values({
        email: DEMO_OWNER_EMAIL,
        displayName: 'Proprietario Demo',
        role: 'seller',
        identityVerifiedAt: new Date('2026-01-15T10:00:00Z'),
        identityMethod: 'spid',
      })
      .returning({ id: users.id });
    return row!.id;
  }

  async upsert(listing: DemoListingSeed): Promise<void> {
    const ownerId = await this.ensureDemoOwner();
    const wpPostId = demoWpPostId(listing.wpKey);
    const attributes = {
      demo: true,
      demoRef: listing.ref,
      demoScenario: listing.scenario ?? null,
      demoImage: true,
      omiMinEurSqm: listing.omiMinEurSqm,
      omiMaxEurSqm: listing.omiMaxEurSqm,
      eurPerSqm: listing.eurPerSqm,
      responseRatePct: listing.responseRatePct,
      medianResponseHours: listing.medianResponseHours,
      apeAvailable: listing.apeAvailable,
      floor: listing.floor,
      yearBuilt: listing.yearBuilt,
      condoFeeEur: listing.condoFeeEur,
      zoneId: listing.zoneId,
    };
    const values = {
      wpPostId,
      slug: listing.slug,
      title: listing.title,
      description: listing.description,
      status: listing.status,
      transactionType: 'sale' as const,
      price: String(listing.priceEur),
      currency: 'EUR',
      bedrooms: listing.rooms,
      rooms: listing.rooms,
      sizeSqm: String(listing.sqm),
      energyClass: listing.energyClass || null,
      propertyType: 'apartment',
      address: listing.address,
      city: listing.city,
      province: listing.province,
      latitude: listing.lat,
      longitude: listing.lng,
      ownerUserId: ownerId,
      agentId: ownerId,
      source: 'demo',
      attributes,
      publishedAt: listing.status === 'published' ? new Date('2026-03-01T09:00:00Z') : null,
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
          price: values.price,
          bedrooms: values.bedrooms,
          rooms: values.rooms,
          sizeSqm: values.sizeSqm,
          energyClass: values.energyClass,
          address: values.address,
          city: values.city,
          province: values.province,
          latitude: values.latitude,
          longitude: values.longitude,
          ownerUserId: values.ownerUserId,
          agentId: values.agentId,
          source: values.source,
          attributes: values.attributes,
          publishedAt: values.publishedAt,
          updatedAt: values.updatedAt,
        },
      })
      .returning();

    if (row && row.status === 'published') {
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
  }

  async countDemo(): Promise<number> {
    const [r] = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(listings)
      .where(eq(listings.source, 'demo'));
    return r?.c ?? 0;
  }
}
