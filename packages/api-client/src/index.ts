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

/* Phase 8/9 — re-export catalog, fascicolo, money, http --------------------- */
export {
  ApiError as OwnerApiError,
  createRequester,
  type Requester,
  type RequesterOptions,
} from './http';
export {
  formatEuroCents,
  summarizeQuote,
  type QuoteDisplay,
  type QuoteDisplayLine,
} from './money';
export {
  EasyCasaOwnerApi,
  CatalogItemSchema,
  ServicePackageSchema,
  QuoteLineSchema,
  QuoteSchema,
  BlockerSchema,
  GateResultSchema,
  FascicoloEvaluationSchema,
  ChecklistEntrySchema,
  DocumentInstanceSchema,
  FascicoloViewSchema,
  OwnerPropertySchema,
  PriceModelSchema,
  type CatalogItem,
  type ServicePackage,
  type Quote,
  type QuoteLine,
  type QuoteRequest,
  type Blocker,
  type GateResult,
  type FascicoloEvaluation,
  type ChecklistEntry,
  type DocumentInstance,
  type FascicoloView,
  type OwnerProperty,
  type PriceModel,
} from './phase8';

export {
  OrderLineSchema,
  OrderStatusSchema,
  OrderSchema,
  MandateStatusSchema,
  MandateTypeSchema,
  MandateSchema,
  SigningUrlSchema,
  EasyCasaTransactionsApi,
  type OrderLine,
  type OrderStatus,
  type Order,
  type CreateOrderRequest,
  type MandateStatus,
  type MandateType,
  type Mandate,
  type SigningUrl,
} from './phase10';

export {
  CredentialTypeSchema,
  VerificationStatusSchema,
  CredentialSchema,
  ProfessionalSchema,
  AssignmentStatusSchema,
  AssignmentSchema,
  CandidateSchema,
  EasyCasaOrchestrationApi,
  type CredentialType,
  type VerificationStatus,
  type Credential,
  type Professional,
  type AssignmentStatus,
  type Assignment,
  type Candidate,
} from './phase11';

export {
  LeaseTypeSchema,
  LeaseIssueSchema,
  LeaseValidationSchema,
  LeaseSchema,
  RegistrationTaxesSchema,
  RliPayloadSchema,
  KycStatusSchema,
  KycCaseSchema,
  EasyCasaRentalsApi,
  type LeaseType,
  type LeaseInput,
  type LeaseValidation,
  type Lease,
  type RliPayload,
  type KycStatus,
  type KycCase,
} from './phase12';

export {
  EasyCasaAdminApi,
  LegalBasisSchema,
  RequiredCredentialSchema,
  AdminCatalogItemSchema,
  type LegalBasis,
  type RequiredCredential,
  type AdminCatalogItem,
} from './admin';

export {
  EasyCasaMeApi,
  MeOwnerPropertySchema,
  PresignResultSchema,
  OkSchema,
  type MeOwnerProperty,
  type PresignResult,
} from './phase14';

export {
  EasyCasaProfessionalApi,
  CredentialSchema as ProCredentialSchema,
  ProProfileSchema,
  ProAssignmentSchema,
  AssignmentStatusSchema as ProAssignmentStatusSchema,
  type ProCredential,
  type ProProfile,
  type ProAssignment,
  type AssignmentStatus as ProAssignmentStatus,
} from './phase15';

export {
  EasyCasaPaymentsApi,
  EasyCasaBillingApi,
  PaymentStatusSchema,
  PaymentIntentSchema,
  CreatedIntentSchema,
  FatturaSchema,
  InvoiceSchema as PaymentInvoiceSchema,
  type PaymentStatus,
  type PaymentIntent,
  type CreatedIntent,
  type Fattura,
  type Invoice as PaymentInvoice,
} from './phase17';

export {
  EasyCasaSearchApi,
  DealTypeSchema,
  PropertyTypeSchema,
  EnergyClassSchema,
  ClusterSchema,
  ListingPinSchema,
  SearchResultSchema,
  type SearchFilters,
  type SearchFilters as MapSearchFilters,
  type Cluster,
  type ListingPin,
  type SearchResult as MapSearchResult,
  type GeoPoint as MapGeoPoint,
} from './phase20';

export {
  EasyCasaListingsApi,
  ListingDetailSchema as ListingPageSchema,
  SimilarPinSchema,
  PhotoSchema as ListingPhotoSchema,
  type ListingDetail as ListingPageDetail,
  type SimilarPin,
} from './phase21';

export {
  EasyCasaSavedSearchesApi,
  AlertFrequencySchema,
  AlertSavedSearchSchema,
  type AlertFrequency,
  type AlertSavedSearch,
  type SavedSearchCriteria as AlertSavedSearchCriteria,
  type SavedSearchCriteria as Phase22SavedSearchCriteria,
} from './phase22';

export {
  EasyCasaEnquiriesApi,
  EnquiryIntentSchema,
  EnquiryStatusSchema,
  EnquirySchema,
  ConvertResultSchema,
  type EnquiryIntent,
  type EnquiryStatus,
  type EnquiryEvent,
  type Enquiry,
  type ConvertResult,
} from './phase24';

import {
  QuoteSchema,
  FascicoloViewSchema,
  FascicoloEvaluationSchema,
  OwnerPropertySchema,
  type Quote,
  type FascicoloView,
  type FascicoloEvaluation,
  type OwnerProperty,
} from './phase8';

/** Full property row from POST /properties (includes ownerId). */
export const PropertySchema = OwnerPropertySchema.extend({
  ownerId: z.string(),
  listingId: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});
export type Property = z.infer<typeof PropertySchema>;

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
  const query = (raw.criteria ?? raw.query ?? raw.params ?? {}) as Record<string, unknown>;
  const created =
    raw.createdAt instanceof Date
      ? raw.createdAt.toISOString()
      : String(raw.createdAt ?? new Date().toISOString());
  const frequency = typeof raw.frequency === 'string' ? raw.frequency : null;
  const alertsEnabled =
    frequency != null ? frequency !== 'off' : Boolean(raw.notify ?? raw.alertsEnabled ?? true);
  return SavedSearchSchema.parse({
    id: String(raw.id),
    name: String(raw.name),
    params: query,
    alertsEnabled,
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

  async getMe(): Promise<{
    id: string;
    role: string;
    email: string | null;
    displayName: string | null;
  }> {
    const json = await this.requestJson('/me');
    return z
      .object({
        id: z.string(),
        role: z.string(),
        email: z.string().nullable().optional(),
        displayName: z.string().nullable().optional(),
      })
      .transform((r) => ({
        id: r.id,
        role: r.role,
        email: r.email ?? null,
        displayName: r.displayName ?? null,
      }))
      .parse(json);
  }

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

  /* Phase 8 — service catalog + fascicolo -------------------------------- */

  listServiceCatalog(): Promise<unknown> {
    return this.requestJson('/service-catalog');
  }

  listServicePackages(): Promise<unknown> {
    return this.requestJson('/service-catalog/packages');
  }

  quoteServices(input: {
    items?: string[];
    packageCode?: string;
    referenceValueCents?: number;
  }): Promise<Quote> {
    return this.requestJson('/service-catalog/quote', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((j) => QuoteSchema.parse(j));
  }

  confirmServiceOrder(input: {
    propertyId: string;
    items?: string[];
    packageCode?: string;
    referenceValueCents?: number;
  }): Promise<{ orderId: string; quote: Quote }> {
    return this.requestJson('/service-catalog/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((j) =>
      z.object({ orderId: z.string(), quote: QuoteSchema }).parse(j),
    );
  }

  listMyProperties(): Promise<OwnerProperty[]> {
    return this.requestJson('/me/properties').then((j) =>
      z.array(OwnerPropertySchema).parse(j),
    );
  }

  createProperty(input: {
    dealType: 'sale' | 'rent';
    title?: string;
    inCondominio?: boolean;
  }): Promise<Property> {
    return this.requestJson('/properties', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((j) => PropertySchema.parse(j));
  }

  getFascicolo(propertyId: string): Promise<FascicoloView> {
    return this.requestJson(`/properties/${encodeURIComponent(propertyId)}/fascicolo`).then(
      (j) => FascicoloViewSchema.parse(j),
    );
  }

  getFascicoloGates(propertyId: string): Promise<FascicoloEvaluation> {
    return this.requestJson(
      `/properties/${encodeURIComponent(propertyId)}/fascicolo/gates`,
    ).then((j) => FascicoloEvaluationSchema.parse(j));
  }

  addFascicoloDocument(
    propertyId: string,
    input: { code: string; url: string; issuedAt?: string },
  ): Promise<FascicoloEvaluation> {
    return this.requestJson(
      `/properties/${encodeURIComponent(propertyId)}/fascicolo/documents`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ).then((j) => FascicoloEvaluationSchema.parse(j));
  }
}
