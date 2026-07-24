/** Shared domain enums + DTO shapes used across web + api. */
/** @deprecated Prefer AssetClassSlug / multi-axis taxonomy in taxonomy.ts */
export type PropertyCategory =
  | 'residential' | 'renovatable' | 'nib' | 'commercial' | 'auction' | 'rooms';

export type ListingStatus = 'draft' | 'published' | 'sold' | 'archived';
/** @deprecated Prefer TransactionTypeSlug from taxonomy.ts (includes auction / bare_ownership) */
export type TransactionType = 'sale' | 'rent' | 'auction' | 'bare_ownership';
export type UserRole =
  | 'buyer'
  | 'seller'
  | 'agent'
  | 'partner'
  | 'pro_marketer'
  | 'admin'
  | 'professional';

export interface HealthStatus {
  status: 'ok';
  service: string;
  time: string;
}

export interface ListingSummary {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  currency: string;
  transactionType: TransactionType | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqm: number | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ListingStatus;
  coverUrl: string | null;
  /** Listing photos for search-card carousels (cover first). */
  imageUrls?: string[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GeoBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}
