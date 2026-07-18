/**
 * Map-search domain — pure types. Prices in integer euro cents; coordinates in
 * WGS84 degrees.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Viewport bounding box. */
export interface BBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/** A draw-to-search polygon: an ordered ring of points (auto-closed). */
export type Polygon = GeoPoint[];

export type DealType = 'sale' | 'rent';

export type PropertyType = 'apartment' | 'house' | 'villa' | 'room' | 'land' | 'commercial';

/** Italian energy classes, best → worst. */
export type EnergyClass = 'A4' | 'A3' | 'A2' | 'A1' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface SearchFilters {
  dealType?: DealType;
  priceMinCents?: number;
  priceMaxCents?: number;
  types?: PropertyType[];
  minRooms?: number;
  minAreaM2?: number;
  energyClasses?: EnergyClass[];
}

/** A listing as held in the search index / returned to the map. */
export interface ListingPin {
  listingId: string;
  lat: number;
  lng: number;
  priceCents: number;
  dealType: DealType;
  type: PropertyType;
  rooms: number;
  areaM2: number;
  energyClass: EnergyClass | null;
  title: string;
  thumbnailUrl: string | null;
}

/** A map cluster; when `count` is 1 it carries the single listing id. */
export interface Cluster {
  lat: number;
  lng: number;
  count: number;
  listingId: string | null;
}

export interface SearchQuery {
  bbox: BBox;
  polygon?: Polygon;
  filters: SearchFilters;
  zoom: number;
}

export interface SearchResult {
  clusters: Cluster[];
  /** Individual pins in view (capped), for the list panel. */
  pins: ListingPin[];
  total: number;
}
