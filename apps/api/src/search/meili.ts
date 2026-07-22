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
  regionSlug: string | null;
  categorySlug: string | null;
  transactionType: 'sale' | 'rent' | null;
  /** Alias used by some map-index paths; prefer transactionType. */
  dealType?: 'sale' | 'rent' | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  /** Prefer bedrooms when rooms is null. */
  rooms?: number | null;
  sizeSqm: number | null;
  /** Map filter: apartment | house | villa | room | land | commercial */
  propertyType?: string | null;
  energyClass?: string | null;
  coverUrl: string | null;
  status: string;
  _geo?: { lat: number; lng: number };
  publishedAt: number | null;
}
