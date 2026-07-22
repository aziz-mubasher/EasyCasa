import { Injectable, Logger } from '@nestjs/common';
import type { Index } from 'meilisearch';

import { buildIndexFilters } from './domain/filters';
import type { SearchIndexPort } from './domain/ports';
import type {
  BBox,
  DealType,
  EnergyClass,
  ListingPin,
  PropertyType,
  SearchFilters,
} from './domain/types';
import { LISTINGS_INDEX, getMeili, type ListingDoc } from './meili';

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

/**
 * Meilisearch adapter for map search. Uses the shared `listings` index
 * (same docs as text search), with `_geoBoundingBox` + attribute filters.
 */
@Injectable()
export class MeiliSearchIndex implements SearchIndexPort {
  private readonly logger = new Logger(MeiliSearchIndex.name);

  private get index(): Index<ListingDoc> {
    return getMeili().index<ListingDoc>(LISTINGS_INDEX);
  }

  private geoFilter(bbox: BBox, filters: SearchFilters): string[] {
    const geo = `_geoBoundingBox([${bbox.maxLat}, ${bbox.maxLng}], [${bbox.minLat}, ${bbox.minLng}])`;
    return ['status = "published"', geo, ...buildIndexFilters(filters)];
  }

  async searchInBounds(
    bbox: BBox,
    filters: SearchFilters,
    limit: number,
  ): Promise<ListingPin[]> {
    try {
      const res = await this.index.search('', {
        filter: this.geoFilter(bbox, filters),
        limit,
      });
      return res.hits
        .map((h) => this.toPin(h))
        .filter((p): p is ListingPin => p !== null);
    } catch (e) {
      this.logger.warn(`map search failed: ${(e as Error).message}`);
      return [];
    }
  }

  async countInBounds(bbox: BBox, filters: SearchFilters): Promise<number> {
    try {
      const res = await this.index.search('', {
        filter: this.geoFilter(bbox, filters),
        limit: 0,
      });
      return res.estimatedTotalHits ?? 0;
    } catch {
      return 0;
    }
  }

  async upsert(pin: ListingPin): Promise<void> {
    const doc: Partial<ListingDoc> & { id: string } = {
      id: pin.listingId,
      title: pin.title,
      transactionType: pin.dealType,
      price: pin.priceCents / 100,
      rooms: pin.rooms,
      bedrooms: pin.rooms,
      sizeSqm: pin.areaM2,
      propertyType: pin.type,
      energyClass: pin.energyClass,
      coverUrl: pin.thumbnailUrl,
      status: 'published',
      _geo: { lat: pin.lat, lng: pin.lng },
    };
    const task = await this.index.updateDocuments([doc], { primaryKey: 'id' });
    // Wait so integration/pilot seed searches see the document immediately.
    await getMeili().waitForTask(task.taskUid);
  }

  async remove(listingId: string): Promise<void> {
    await this.index.deleteDocument(listingId);
  }

  private toPin(d: ListingDoc): ListingPin | null {
    if (!d._geo) return null;
    const deal = d.transactionType ?? d.dealType;
    if (deal !== 'sale' && deal !== 'rent') return null;

    const price = d.price == null ? 0 : Number(d.price);
    const rooms = d.rooms ?? d.bedrooms ?? 0;
    const area = d.sizeSqm == null ? 0 : Number(d.sizeSqm);
    const rawType = d.propertyType ?? inferPropertyType(d.categorySlug);
    const type = PROPERTY_TYPES.has(rawType) ? (rawType as PropertyType) : 'apartment';
    const energy =
      d.energyClass && ENERGY.has(d.energyClass)
        ? (d.energyClass as EnergyClass)
        : null;

    return {
      listingId: d.id,
      lat: d._geo.lat,
      lng: d._geo.lng,
      priceCents: Math.round(price * 100),
      dealType: deal as DealType,
      type,
      rooms,
      areaM2: area,
      energyClass: energy,
      title: d.title,
      thumbnailUrl: d.coverUrl,
    };
  }
}

export function inferPropertyType(categorySlug: string | null | undefined): PropertyType {
  const s = (categorySlug ?? '').toLowerCase();
  if (s.includes('villa')) return 'villa';
  if (s.includes('house') || s.includes('casa') || s.includes('indipendent')) return 'house';
  if (s.includes('land') || s.includes('terren')) return 'land';
  if (s.includes('commercial') || s.includes('negozio') || s.includes('ufficio')) {
    return 'commercial';
  }
  if (s.includes('room') || s.includes('stanza') || s.includes('camera')) return 'room';
  return 'apartment';
}
