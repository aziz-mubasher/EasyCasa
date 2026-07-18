import { MeiliSearch } from 'meilisearch';
import { apiConfig } from '../config';

export const meili = new MeiliSearch({
  host: apiConfig.MEILI_URL,
  apiKey: apiConfig.MEILI_MASTER_KEY,
});

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
