/**
 * @easycasa/api-client
 *
 * Typed client for the EasyCasa Nest API. Shared by Next.js and the Expo app.
 * Shapes match the live API (ListingSummary / Meilisearch hits / favorites join).
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Schemas                                                             */
/* ------------------------------------------------------------------ */

export const ListingStatusSchema = z.enum(['draft', 'published', 'sold', 'archived']);
export type ListingStatus = z.infer<typeof ListingStatusSchema>;

export const GeoPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;

export const MediaSchema = z.object({
  id: z.string(),
  url: z.string(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  alt: z.string().nullable().optional(),
  position: z.number().optional(),
});
export type Media = z.infer<typeof MediaSchema>;

/** Canonical listing card shape used by mobile + web consumers. */
export const ListingSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  status: ListingStatusSchema.or(z.string()),
  priceEur: z.number().nullable(),
  currency: z.string().default('EUR'),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  areaSqm: z.number().nullable(),
  city: z.string().nullable().optional(),
  location: GeoPointSchema.nullable(),
  coverUrl: z.string().nullable(),
  /** Convenience alias — same as coverUrl when present. */
  cover: z
    .object({ url: z.string() })
    .nullable()
    .optional(),
});
export type Listing = z.infer<typeof ListingSchema>;

export const ListingDetailSchema = ListingSchema.extend({
  description: z.string().nullable().optional(),
  media: z.array(MediaSchema).default([]),
  qrCodeUrl: z.string().nullable().optional(),
});
export type ListingDetail = z.infer<typeof ListingDetailSchema>;

export const PagedListingsSchema = z.object({
  items: z.array(ListingSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type PagedListings = z.infer<typeof PagedListingsSchema>;

export const RegionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
});
export type Region = z.infer<typeof RegionSchema>;

export const CategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  key: z.string().optional(),
});
export type Category = z.infer<typeof CategorySchema>;

export const SavedSearchSchema = z.object({
  id: z.string(),
  name: z.string(),
  params: z.record(z.string(), z.unknown()).default({}),
  alertsEnabled: z.boolean(),
  createdAt: z.string(),
});
export type SavedSearch = z.infer<typeof SavedSearchSchema>;

/* ------------------------------------------------------------------ */
/* Raw API → client mappers                                            */
/* ------------------------------------------------------------------ */

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapListing(raw: Record<string, unknown>): Listing {
  const price = num(raw.price ?? raw.priceEur);
  const lat = num(raw.latitude ?? (raw._geo as { lat?: number } | undefined)?.lat);
  const lng = num(raw.longitude ?? (raw._geo as { lng?: number } | undefined)?.lng);
  const coverUrl =
    (typeof raw.coverUrl === 'string' ? raw.coverUrl : null) ??
    (typeof (raw.cover as { url?: string } | null)?.url === 'string'
      ? (raw.cover as { url: string }).url
      : null);
  const size = num(raw.sizeSqm ?? raw.areaSqm);
  return ListingSchema.parse({
    id: String(raw.id),
    slug: String(raw.slug ?? raw.id),
    title: String(raw.title ?? ''),
    status: String(raw.status ?? 'published'),
    priceEur: price,
    currency: typeof raw.currency === 'string' ? raw.currency : 'EUR',
    bedrooms: num(raw.bedrooms),
    bathrooms: num(raw.bathrooms),
    areaSqm: size,
    city: raw.city == null ? null : String(raw.city),
    location: lat != null && lng != null ? { lat, lng } : null,
    coverUrl,
    cover: coverUrl ? { url: coverUrl } : null,
  });
}

function mapDetail(raw: Record<string, unknown>): ListingDetail {
  const base = mapListing(raw);
  const mediaRaw = Array.isArray(raw.media) ? raw.media : [];
  const media = mediaRaw.map((m) => {
    const row = m as Record<string, unknown>;
    return MediaSchema.parse({
      id: String(row.id ?? row.url),
      url: String(row.url),
      width: num(row.width),
      height: num(row.height),
      alt: row.alt == null ? null : String(row.alt),
      position: num(row.position) ?? undefined,
    });
  });
  return ListingDetailSchema.parse({
    ...base,
    description: raw.description == null ? null : String(raw.description),
    media,
    qrCodeUrl: raw.qrCodeUrl == null ? null : String(raw.qrCodeUrl),
  });
}

function mapSavedSearch(raw: Record<string, unknown>): SavedSearch {
  const query = (raw.query ?? raw.params ?? {}) as Record<string, unknown>;
  const created =
    raw.createdAt instanceof Date
      ? raw.createdAt.toISOString()
      : String(raw.createdAt ?? new Date().toISOString());
  return SavedSearchSchema.parse({
    id: String(raw.id),
    name: String(raw.name),
    params: query,
    alertsEnabled: Boolean(raw.notify ?? raw.alertsEnabled ?? true),
    createdAt: created,
  });
}

/* ------------------------------------------------------------------ */
/* Search params                                                       */
/* ------------------------------------------------------------------ */

export interface SearchParams {
  q?: string;
  categorySlug?: string;
  regionSlug?: string;
  minPriceEur?: number;
  maxPriceEur?: number;
  bedrooms?: number;
  /** Map viewport bounding box: [west, south, east, north]. */
  bbox?: [number, number, number, number];
  page?: number;
  pageSize?: number;
}

function toListingQuery(params: SearchParams): string {
  const sp = new URLSearchParams();
  if (params.categorySlug) sp.set('categorySlug', params.categorySlug);
  if (params.regionSlug) sp.set('regionSlug', params.regionSlug);
  if (params.minPriceEur != null) sp.set('minPrice', String(params.minPriceEur));
  if (params.maxPriceEur != null) sp.set('maxPrice', String(params.maxPriceEur));
  if (params.bedrooms != null) sp.set('minBedrooms', String(params.bedrooms));
  if (params.bbox) {
    const [west, south, east, north] = params.bbox;
    sp.set('minLng', String(west));
    sp.set('minLat', String(south));
    sp.set('maxLng', String(east));
    sp.set('maxLat', String(north));
  }
  if (params.page != null) sp.set('page', String(params.page));
  if (params.pageSize != null) sp.set('pageSize', String(params.pageSize));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function toSearchQuery(params: SearchParams): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.categorySlug) sp.set('categorySlug', params.categorySlug);
  if (params.regionSlug) sp.set('regionSlug', params.regionSlug);
  if (params.minPriceEur != null) sp.set('minPrice', String(params.minPriceEur));
  if (params.maxPriceEur != null) sp.set('maxPrice', String(params.maxPriceEur));
  if (params.bedrooms != null) sp.set('minBedrooms', String(params.bedrooms));
  if (params.page != null) sp.set('page', String(params.page));
  if (params.pageSize != null) sp.set('pageSize', String(params.pageSize));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  /** Base URL of the API, e.g. https://easycasaita.com/api */
  baseUrl: string;
  getAccessToken?: () => Promise<string | null> | string | null;
  fetchFn?: typeof fetch;
}

export class EasyCasaClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: ApiClientOptions['getAccessToken'];
  private readonly fetchFn: typeof fetch;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.getAccessToken = opts.getAccessToken;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  private async requestJson(path: string, init?: RequestInit): Promise<unknown> {
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await this.fetchFn(`${this.baseUrl}${path}`, { ...init, headers });
    const text = await res.text();
    const json: unknown = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new ApiError(res.status, `API ${res.status} for ${path}`, json);
    }
    return json;
  }

  /* Public listings ------------------------------------------------- */

  async searchListings(params: SearchParams = {}): Promise<PagedListings> {
    const useMeili = Boolean(params.q && params.q.trim());
    const path = useMeili
      ? `/search${toSearchQuery(params)}`
      : `/listings${toListingQuery(params)}`;
    const json = (await this.requestJson(path)) as {
      items?: unknown[];
      total?: number;
      page?: number;
      pageSize?: number;
    };
    const items = (json.items ?? []).map((row) => mapListing(row as Record<string, unknown>));
    return PagedListingsSchema.parse({
      items,
      total: json.total ?? items.length,
      page: json.page ?? 1,
      pageSize: json.pageSize ?? params.pageSize ?? 24,
    });
  }

  async getListing(slug: string): Promise<ListingDetail> {
    const json = await this.requestJson(`/listings/${encodeURIComponent(slug)}`);
    return mapDetail(json as Record<string, unknown>);
  }

  async listRegions(): Promise<Region[]> {
    const json = await this.requestJson('/regions');
    return z.array(RegionSchema).parse(json);
  }

  async listCategories(): Promise<Category[]> {
    const json = await this.requestJson('/categories');
    return z.array(CategorySchema).parse(json);
  }

  /* Authenticated — favorites & saved searches ---------------------- */

  async getFavorites(): Promise<Listing[]> {
    const json = await this.requestJson('/me/favorites');
    return z.array(z.record(z.unknown())).parse(json).map((row) => mapListing(row));
  }

  addFavorite(listingId: string): Promise<{ ok: true }> {
    return this.requestJson(`/me/favorites/${encodeURIComponent(listingId)}`, {
      method: 'PUT',
    }).then((j) => z.object({ ok: z.literal(true) }).parse(j));
  }

  removeFavorite(listingId: string): Promise<{ ok: true }> {
    return this.requestJson(`/me/favorites/${encodeURIComponent(listingId)}`, {
      method: 'DELETE',
    }).then((j) => z.object({ ok: z.literal(true) }).parse(j));
  }

  async getSavedSearches(): Promise<SavedSearch[]> {
    const json = await this.requestJson('/me/saved-searches');
    const rows = z.array(z.record(z.unknown())).parse(json);
    return rows.map(mapSavedSearch);
  }

  registerDevice(input: {
    token: string;
    platform: 'ios' | 'android' | 'web';
    locale: string;
  }): Promise<{ ok: true }> {
    return this.requestJson('/me/devices', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((j) => z.object({ ok: z.literal(true) }).parse(j));
  }
}
