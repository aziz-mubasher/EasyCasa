/**
 * Round-trip between PR #20 web search URL params and saved-search criteria blobs.
 * Web saves `webParams` inside criteria for lossless re-run; map filters mirror Phase 22.
 */

/** Query keys we persist when saving a search (PR #20 URL contract). */
export const SAVED_SEARCH_URL_KEYS = [
  'q',
  'transactionType',
  'minPrice',
  'maxPrice',
  'provinceSlug',
  'regionSlug',
  'city',
  'categorySlug',
  'propertyType',
  'assetClass',
  'condition',
  'financingOption',
  'leaseType',
  'sellerType',
  'minBedrooms',
  'minBathrooms',
  'minSizeSqm',
  'maxSizeSqm',
  'energyClass',
  'features',
  'sort',
] as const;

export type SavedSearchUrlParams = Partial<Record<(typeof SAVED_SEARCH_URL_KEYS)[number], string>>;

export type WebSavedSearchCriteria = {
  filters: Record<string, unknown>;
  webParams?: SavedSearchUrlParams;
  bbox?: Record<string, number>;
  polygon?: Array<{ lat: number; lng: number }>;
};

export function readSearchParamsFromUrl(searchParams: URLSearchParams): SavedSearchUrlParams {
  const out: SavedSearchUrlParams = {};
  for (const key of SAVED_SEARCH_URL_KEYS) {
    const v = searchParams.get(key);
    if (v != null && v !== '') out[key] = v;
  }
  return out;
}

export function hasMeaningfulSearchParams(params: SavedSearchUrlParams): boolean {
  return Object.keys(params).length > 0;
}

export function searchHrefFromSavedCriteria(criteria: Record<string, unknown>): string {
  const web = (criteria.webParams ?? {}) as SavedSearchUrlParams;
  if (Object.keys(web).length > 0) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(web)) {
      if (v) qs.set(k, v);
    }
    const s = qs.toString();
    return s ? `/search?${s}` : '/search';
  }
  return filtersOnlySearchHref(criteria);
}

/** Best-effort rebuild when only Phase 22 `filters` exist (legacy mobile saves). */
function filtersOnlySearchHref(criteria: Record<string, unknown>): string {
  const filters = (criteria.filters ?? {}) as Record<string, unknown>;
  const qs = new URLSearchParams();
  if (typeof filters.dealType === 'string') qs.set('transactionType', filters.dealType);
  if (typeof filters.priceMinCents === 'number') {
    qs.set('minPrice', String(Math.round(filters.priceMinCents / 100)));
  }
  if (typeof filters.priceMaxCents === 'number') {
    qs.set('maxPrice', String(Math.round(filters.priceMaxCents / 100)));
  }
  if (typeof filters.minRooms === 'number') qs.set('minBedrooms', String(filters.minRooms));
  if (typeof filters.minAreaM2 === 'number') qs.set('minSizeSqm', String(filters.minAreaM2));
  const energy = filters.energyClasses;
  if (Array.isArray(energy) && typeof energy[0] === 'string') qs.set('energyClass', energy[0]);
  const types = filters.types;
  if (Array.isArray(types) && typeof types[0] === 'string') qs.set('propertyType', types[0]);
  const s = qs.toString();
  return s ? `/search?${s}` : '/search';
}

export function buildSavedSearchCriteriaFromUrl(params: SavedSearchUrlParams): WebSavedSearchCriteria {
  const filters: Record<string, unknown> = {};
  const tx = params.transactionType;
  if (tx === 'sale' || tx === 'rent') filters.dealType = tx;
  if (params.minPrice) filters.priceMinCents = Number(params.minPrice) * 100;
  if (params.maxPrice) filters.priceMaxCents = Number(params.maxPrice) * 100;
  if (params.minBedrooms) filters.minRooms = Number(params.minBedrooms);
  if (params.minSizeSqm) filters.minAreaM2 = Number(params.minSizeSqm);
  if (params.energyClass) filters.energyClasses = [params.energyClass];
  if (params.propertyType) filters.types = [params.propertyType];
  return { filters, webParams: params };
}

export function summarizeSearchParams(
  params: SavedSearchUrlParams,
  labels: {
    allListings: string;
    sale: string;
    rent: string;
    upToPrice: (max: string) => string;
    fromPrice: (min: string) => string;
    priceRange: (min: string, max: string) => string;
    inLocation: (place: string) => string;
    bedrooms: (n: number) => string;
  },
  resolvePlace?: (params: SavedSearchUrlParams) => string | null,
): string {
  if (!hasMeaningfulSearchParams(params)) return labels.allListings;

  const parts: string[] = [];
  if (params.transactionType === 'sale') parts.push(labels.sale);
  else if (params.transactionType === 'rent') parts.push(labels.rent);

  const place = resolvePlace?.(params) ?? params.city ?? params.provinceSlug ?? params.regionSlug ?? null;
  if (place) parts.push(labels.inLocation(place));

  if (params.minPrice && params.maxPrice) {
    parts.push(labels.priceRange(params.minPrice, params.maxPrice));
  } else if (params.maxPrice) {
    parts.push(labels.upToPrice(params.maxPrice));
  } else if (params.minPrice) {
    parts.push(labels.fromPrice(params.minPrice));
  }

  if (params.minBedrooms) {
    const n = Number(params.minBedrooms);
    if (Number.isFinite(n) && n > 0) parts.push(labels.bedrooms(n));
  }

  if (parts.length === 0) return labels.allListings;
  return parts.join(', ');
}
