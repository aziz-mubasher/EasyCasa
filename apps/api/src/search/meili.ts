import { MeiliSearch } from 'meilisearch';
import { loadApiConfig } from '../config';

let _client: MeiliSearch | null = null;

/** Lazy Meilisearch client — avoids loadApiConfig() at module import (Phase 34 int harness). */
export function getMeili(): MeiliSearch {
  if (!_client) {
    const cfg = loadApiConfig();
    _client = new MeiliSearch({
      host: cfg.MEILI_URL,
      apiKey: cfg.MEILI_MASTER_KEY,
    });
  }
  return _client;
}

export const LISTINGS_INDEX = 'listings';

export interface ListingDoc {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  city: string | null;
  provinceSlug: string | null;
  regionSlug: string | null;
  /** Legacy Tipologia slug kept for PR #20 URL/API compat. */
  categorySlug: string | null;
  transactionType: 'sale' | 'rent' | 'auction' | 'bare_ownership' | null;
  /** Alias used by some map-index paths; prefer transactionType. */
  dealType?: 'sale' | 'rent' | 'auction' | 'bare_ownership' | null;
  assetClass?: string | null;
  propertyType?: string | null;
  condition?: string | null;
  financingOptions?: string[];
  leaseType?: string | null;
  sellerType?: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  /** Prefer bedrooms when rooms is null. */
  rooms?: number | null;
  sizeSqm: number | null;
  energyClass?: string | null;
  coverUrl: string | null;
  /** Image URLs for search cards (ordered; coverUrl is typically imageUrls[0]). */
  imageUrls?: string[];
  status: string;
  _geo?: { lat: number; lng: number };
  publishedAt: number | null;
}
