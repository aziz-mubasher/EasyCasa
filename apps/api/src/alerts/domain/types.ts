/**
 * Saved searches & alerts — pure types. A saved search is a stored Phase 20
 * query (filters + area) plus a notification frequency.
 */
import type {
  BBox,
  EnergyClass,
  ListingPin,
  Polygon,
  PropertyType,
  SearchFilters,
} from '../../search/domain/types';

export type AlertFrequency = 'instant' | 'daily' | 'off';

export interface SavedSearchCriteria {
  filters: SearchFilters;
  bbox?: BBox;
  polygon?: Polygon;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  criteria: SavedSearchCriteria;
  frequency: AlertFrequency;
  lastRunAt: string | null;
}

export interface DigestItem {
  listingId: string;
  title: string;
  priceCents: number;
}

export interface Digest {
  savedSearchId: string;
  savedSearchName: string;
  items: DigestItem[];
  total: number;
}

export type {
  BBox,
  EnergyClass,
  ListingPin,
  Polygon,
  PropertyType,
  SearchFilters,
};
