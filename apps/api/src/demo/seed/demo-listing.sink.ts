import { Inject, Injectable } from '@nestjs/common';
import { normalizeProvinceSlug } from '@easycasa/shared';
import { eq, sql } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { listings, media, users } from '../../db/schema';
import type { ListingDoc } from '../../search/meili';
import { SearchService } from '../../search/search.service';
import { demoImageUrls } from './demo-images';
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
    private readonly search: SearchService,
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

  /**
   * Upsert listing + demo media. Returns a Meili doc when published (caller may
   * batch-index); otherwise removes the id from the index.
   */
  async upsert(listing: DemoListingSeed): Promise<ListingDoc | null> {
    const ownerId = await this.ensureDemoOwner();
    const wpPostId = demoWpPostId(listing.wpKey);
    const imageUrls = listing.imageDemoFlag ? demoImageUrls(listing.wpKey, 3) : [];
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

    if (!row) return null;

    await this.db.delete(media).where(eq(media.listingId, row.id));
    if (imageUrls.length > 0) {
      await this.db.insert(media).values(
        imageUrls.map((url, position) => ({
          listingId: row.id,
          type: 'image' as const,
          url,
          position,
          alt: `${listing.title} (demo)`,
          width: 960,
          height: 720,
        })),
      );
    }

    if (row.status === 'published') {
      return this.toSearchDoc(row, imageUrls);
    }
    await this.search.remove(row.id);
    return null;
  }

  async indexPublished(docs: ListingDoc[]): Promise<void> {
    if (docs.length === 0) return;
    await this.search.indexBatch(docs);
  }

  private toSearchDoc(
    row: typeof listings.$inferSelect,
    imageUrls: string[],
  ): ListingDoc {
    return {
      id: row.id,
      slug: row.slug ?? row.id,
      title: row.title,
      description: row.description,
      city: row.city,
      provinceSlug: normalizeProvinceSlug(row.province),
      regionSlug: null,
      categorySlug: 'appartamento',
      transactionType: row.transactionType,
      transactionTypes: row.transactionType ? [row.transactionType] : [],
      assetClass: 'residential',
      propertyType: row.propertyType ?? 'apartment',
      condition: null,
      financingOptions: [],
      leaseType: null,
      sellerType: 'private',
      price: row.price == null ? null : Number(row.price),
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      rooms: row.rooms ?? row.bedrooms,
      sizeSqm: row.sizeSqm == null ? null : Number(row.sizeSqm),
      surfaceSqm: null,
      yearBuilt: row.yearBuilt ?? null,
      yearRenovated: null,
      energyClass: row.energyClass ?? null,
      features: row.features ?? [],
      coverUrl: imageUrls[0] ?? null,
      imageUrls,
      status: 'published',
      _geo:
        row.latitude != null && row.longitude != null
          ? { lat: row.latitude, lng: row.longitude }
          : undefined,
      publishedAt: row.publishedAt ? row.publishedAt.getTime() : Date.now(),
    };
  }

  async countDemo(): Promise<number> {
    const [r] = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(listings)
      .where(eq(listings.source, 'demo'));
    return r?.c ?? 0;
  }
}
