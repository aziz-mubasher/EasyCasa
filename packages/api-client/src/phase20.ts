/**
 * Phase 20 client — map search. `searchByBounds` is the default viewport query;
 * `searchByArea` powers draw-to-search. Returns clusters for the map and a
 * capped pin list for the results panel.
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';

export const DealTypeSchema = z.enum(['sale', 'rent']);
export const PropertyTypeSchema = z.enum([
  'apartment',
  'house',
  'villa',
  'room',
  'land',
  'commercial',
]);
export const EnergyClassSchema = z.enum([
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

export interface SearchFilters {
  dealType?: z.infer<typeof DealTypeSchema>;
  priceMinCents?: number;
  priceMaxCents?: number;
  types?: z.infer<typeof PropertyTypeSchema>[];
  minRooms?: number;
  minAreaM2?: number;
  energyClasses?: z.infer<typeof EnergyClassSchema>[];
}

export const ClusterSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  count: z.number().int(),
  listingId: z.string().nullable(),
});
export type Cluster = z.infer<typeof ClusterSchema>;

export const ListingPinSchema = z.object({
  listingId: z.string(),
  lat: z.number(),
  lng: z.number(),
  priceCents: z.number().int(),
  dealType: DealTypeSchema,
  type: PropertyTypeSchema,
  rooms: z.number().int(),
  areaM2: z.number(),
  energyClass: EnergyClassSchema.nullable(),
  title: z.string(),
  thumbnailUrl: z.string().nullable(),
});
export type ListingPin = z.infer<typeof ListingPinSchema>;

export const SearchResultSchema = z.object({
  clusters: z.array(ClusterSchema),
  pins: z.array(ListingPinSchema),
  total: z.number().int(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export class EasyCasaSearchApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(private readonly opts: RequesterOptions) {
    this.request = createRequester(opts);
  }

  /** Viewport search: pass the map's visible bounds + zoom. */
  searchByBounds(body: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
    zoom: number;
    filters?: SearchFilters;
  }): Promise<SearchResult> {
    return this.request('/search/bounds', SearchResultSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /** Draw-to-search: pass the drawn polygon + zoom. */
  searchByArea(body: {
    polygon: GeoPoint[];
    zoom: number;
    filters?: SearchFilters;
  }): Promise<SearchResult> {
    return this.request('/search/area', SearchResultSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
