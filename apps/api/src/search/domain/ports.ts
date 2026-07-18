import type { BBox, ListingPin, SearchFilters } from './types';

/**
 * Search index seam. The adapter (Meilisearch / PostGIS) applies the bounding
 * box and attribute filters; polygon masking and clustering happen in the
 * domain over the returned pins.
 */
export interface SearchIndexPort {
  searchInBounds(bbox: BBox, filters: SearchFilters, limit: number): Promise<ListingPin[]>;
  countInBounds(bbox: BBox, filters: SearchFilters): Promise<number>;
  upsert(pin: ListingPin): Promise<void>;
  remove(listingId: string): Promise<void>;
}

export const SEARCH_INDEX = Symbol('SEARCH_INDEX');
