import type { ListingSummary } from '@easycasa/shared';

// Server components use the internal URL; client uses the public one.
const BASE =
  (typeof window === 'undefined' ? process.env.API_URL : process.env.NEXT_PUBLIC_API_URL) ??
  'http://localhost/api';

export interface SearchResponse {
  items: Array<ListingSummary & { _geo?: { lat: number; lng: number }; categorySlug?: string }>;
  total: number;
  page: number;
  pageSize: number;
  facets: Record<string, Record<string, number>>;
}

export async function searchListings(params: Record<string, string | number | undefined>): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, String(v));
  const res = await fetch(`${BASE}/search?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  const raw = (await res.json()) as SearchResponse & {
    items: Array<
      ListingSummary & {
        _geo?: { lat: number; lng: number };
        categorySlug?: string;
      }
    >;
  };
  // Meilisearch stores coordinates as `_geo`; map components expect lat/lng fields.
  raw.items = raw.items.map((item) => ({
    ...item,
    latitude: item.latitude ?? item._geo?.lat ?? null,
    longitude: item.longitude ?? item._geo?.lng ?? null,
  }));
  return raw;
}

export async function getListing(slug: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${BASE}/listings/${slug}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`listing failed: ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function listRegions(): Promise<Array<{ slug: string; name: string }>> {
  const res = await fetch(`${BASE}/regions`, { next: { revalidate: 3600 } });
  return res.ok ? (res.json() as Promise<Array<{ slug: string; name: string }>>) : [];
}
export async function listProvinces(regionSlug?: string): Promise<Array<{ slug: string; name: string; regionSlug: string }>> {
  const qs = regionSlug ? `?regionSlug=${encodeURIComponent(regionSlug)}` : '';
  const res = await fetch(`${BASE}/provinces${qs}`, { next: { revalidate: 3600 } });
  return res.ok ? (res.json() as Promise<Array<{ slug: string; name: string; regionSlug: string }>>) : [];
}

export async function listCategories(): Promise<Array<{ slug: string; key: string; name: string }>> {
  const res = await fetch(`${BASE}/categories`, { next: { revalidate: 3600 } });
  return res.ok ? (res.json() as Promise<Array<{ slug: string; key: string; name: string }>>) : [];
}

export interface LocationSuggestion {
  kind: 'comune' | 'provincia' | 'regione';
  label: string;
  slug: string;
  provinceSlug?: string;
  regionSlug?: string;
  hierarchy: string;
}

export async function suggestLocations(q: string, signal?: AbortSignal): Promise<LocationSuggestion[]> {
  if (q.trim().length < 2) return [];
  const res = await fetch(`${BASE}/search/locations?q=${encodeURIComponent(q)}`, { signal, cache: 'no-store' });
  if (!res.ok) return [];
  return res.json() as Promise<LocationSuggestion[]>;
}

export interface CatalogItemRow {
  code: string;
  labelEn: string;
  labelIt: string;
  category: string;
  priceModel: 'fixed' | 'provvigione' | 'passthrough';
  amountCents?: number | null;
  ratePercent?: number | null;
  ivaApplicable: boolean;
}

export async function listServiceCatalog(): Promise<CatalogItemRow[]> {
  const res = await fetch(`${BASE}/service-catalog`, { next: { revalidate: 600 } });
  if (!res.ok) return [];
  return res.json() as Promise<CatalogItemRow[]>;
}
