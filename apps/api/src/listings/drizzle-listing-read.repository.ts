import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ne, sql } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings, media, users } from '../db/schema';
import { inferPropertyType } from '../search/meili-search.index';
import type { ListingReadPort } from './domain/ports';
import type {
  DealType,
  EnergyClass,
  PropertyType,
  RawListing,
  SimilarPin,
} from './domain/types';

const ENERGY: ReadonlySet<string> = new Set([
  'A4',
  'A3',
  'A2',
  'A1',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
]);

const PROPERTY_TYPES: ReadonlySet<string> = new Set([
  'apartment',
  'house',
  'villa',
  'room',
  'land',
  'commercial',
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class DrizzleListingReadRepository implements ListingReadPort {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async getRaw(idOrSlug: string): Promise<RawListing | null> {
    const byId = UUID_RE.test(idOrSlug);
    const rows = await this.db
      .select({
        listing: listings,
        agentName: users.displayName,
      })
      .from(listings)
      .leftJoin(users, eq(listings.agentId, users.id))
      .where(byId ? eq(listings.id, idOrSlug) : eq(listings.slug, idOrSlug))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const photos = await this.db
      .select({
        url: media.url,
        sortOrder: media.position,
        type: media.type,
      })
      .from(media)
      .where(eq(media.listingId, row.listing.id))
      .orderBy(asc(media.position));

    const hasFloorPlan =
      row.listing.hasFloorPlan || photos.some((p) => p.type === 'floorplan');

    return this.toRaw(row.listing, row.agentName ?? null, photos, hasFloorPlan);
  }

  async findSimilar(anchor: {
    excludeId: string;
    provincia: string;
    dealType: RawListing['dealType'];
    type: RawListing['type'];
    priceCents: number;
    limit: number;
  }): Promise<SimilarPin[]> {
    const rows = await this.db
      .select({
        id: listings.id,
        title: listings.title,
        price: listings.price,
        sizeSqm: listings.sizeSqm,
        latitude: listings.latitude,
        longitude: listings.longitude,
        thumbnailUrl: sql<string | null>`(
          SELECT url FROM media m
          WHERE m.listing_id = listings.id
          ORDER BY m.position
          LIMIT 1
        )`,
      })
      .from(listings)
      .where(
        and(
          ne(listings.id, anchor.excludeId),
          eq(listings.status, 'published'),
          eq(listings.province, anchor.provincia),
          eq(listings.transactionType, anchor.dealType),
        ),
      )
      .limit(50);

    return rows
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => {
        const priceCents = Math.round(Number(r.price ?? 0) * 100);
        return {
          listingId: r.id,
          title: r.title,
          priceCents,
          areaM2: Number(r.sizeSqm ?? 0),
          lat: r.latitude!,
          lng: r.longitude!,
          thumbnailUrl: r.thumbnailUrl,
          _distance: Math.abs(priceCents - anchor.priceCents),
        };
      })
      .sort((a, b) => a._distance - b._distance)
      .slice(0, anchor.limit)
      .map((row) => ({
        listingId: row.listingId,
        title: row.title,
        priceCents: row.priceCents,
        areaM2: row.areaM2,
        lat: row.lat,
        lng: row.lng,
        thumbnailUrl: row.thumbnailUrl,
      }));
  }

  private toRaw(
    l: typeof listings.$inferSelect,
    agentName: string | null,
    photos: { url: string; sortOrder: number; type: string }[],
    hasFloorPlan: boolean,
  ): RawListing | null {
    const deal = l.transactionType;
    if (deal !== 'sale' && deal !== 'rent') {
      // Default unpublished / unknown deal to sale for detail assembly when missing.
      if (l.status === 'published') return null;
    }
    const dealType: DealType =
      deal === 'rent' || deal === 'sale' ? deal : 'sale';

    const rawType = l.propertyType ?? inferPropertyType(null);
    const type = PROPERTY_TYPES.has(rawType) ? (rawType as PropertyType) : 'apartment';
    const energy =
      l.energyClass && ENERGY.has(l.energyClass)
        ? (l.energyClass as EnergyClass)
        : null;

    const floorNum = parseFloor(l.floor);
    const imagePhotos = photos
      .filter((p) => p.type === 'image' || p.type === 'floorplan')
      .map((p) => ({ url: p.url, sortOrder: p.sortOrder }));

    return {
      id: l.id,
      title: l.title,
      description: l.description,
      dealType,
      type,
      status: l.status,
      priceCents: Math.round(Number(l.price ?? 0) * 100),
      areaM2: Number(l.sizeSqm ?? 0),
      rooms: l.rooms ?? l.bedrooms ?? 0,
      bathrooms: l.bathrooms,
      floor: floorNum,
      totalFloors: l.totalFloors,
      yearBuilt: l.yearBuilt,
      energyClass: energy,
      energyPerformanceKwhM2Y:
        l.energyPerformanceKwhM2Y == null
          ? null
          : Number(l.energyPerformanceKwhM2Y),
      foglio: l.foglio,
      particella: l.particella,
      subalterno: l.subalterno,
      features: l.features ?? [],
      condominioFeesCents: l.condominioFeesCents,
      heating: l.heating,
      lat: l.latitude ?? 0,
      lng: l.longitude ?? 0,
      address: l.address ?? '',
      comune: l.city ?? '',
      provincia: l.province ?? '',
      photos: imagePhotos,
      hasFloorPlan,
      agentId: l.agentId,
      agentName,
    };
  }
}

function parseFloor(floor: string | null): number | null {
  if (floor == null || floor.trim() === '') return null;
  const n = Number.parseInt(floor, 10);
  return Number.isFinite(n) ? n : null;
}
