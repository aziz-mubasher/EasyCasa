import type { TransactionTypeSlug } from '@easycasa/shared';
import he from 'he';
import sanitizeHtml from 'sanitize-html';

export interface ListingMediaRow {
  url: string;
  type: string;
  position?: number;
}

export interface ParsedListingDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  transactionType: TransactionTypeSlug | null;
  transactionTypes: TransactionTypeSlug[];
  price: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  rooms: number | null;
  sizeSqm: number | null;
  surfaceSqm: number | null;
  landSqm: number | null;
  floor: string | null;
  totalFloors: number | null;
  yearBuilt: number | null;
  yearRenovated: number | null;
  energyClass: string | null;
  energyPerformanceKwhM2Y: number | null;
  foglio: string | null;
  particella: string | null;
  subalterno: string | null;
  condition: string | null;
  features: string[];
  city: string | null;
  province: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  photoUrls: string[];
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

const PLAIN_DESCRIPTION_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
};

/** Strip all HTML safely; descriptions may contain legacy WordPress markup. */
export function plainDescription(text: string): string {
  const stripped = sanitizeHtml(text, PLAIN_DESCRIPTION_SANITIZE);
  return he.decode(stripped).trim();
}

export function photoUrlsFromListing(raw: Record<string, unknown>): string[] {
  const media = raw.media as ListingMediaRow[] | undefined;
  if (media?.length) {
    return [...media]
      .filter((m) => m.type === 'image' || m.type === 'floorplan')
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((m) => m.url);
  }
  const imageUrls = raw.imageUrls as string[] | undefined;
  if (imageUrls?.length) return imageUrls;
  const cover = str(raw.coverUrl);
  return cover ? [cover] : [];
}

export function parseListingDetail(raw: Record<string, unknown>, slugFallback: string): ParsedListingDetail {
  const transactionTypesRaw = raw.transactionTypes as string[] | undefined;
  const transactionTypes = (transactionTypesRaw?.length
    ? transactionTypesRaw
    : raw.transactionType
      ? [String(raw.transactionType)]
      : []) as TransactionTypeSlug[];

  const primary = (raw.transactionType as TransactionTypeSlug | null) ?? transactionTypes[0] ?? null;

  return {
    id: String(raw.id ?? slugFallback),
    slug: String(raw.slug ?? slugFallback),
    title: String(raw.title ?? ''),
    description: raw.description ? plainDescription(String(raw.description)) : null,
    status: String(raw.status ?? 'published'),
    transactionType: primary,
    transactionTypes,
    price: num(raw.price),
    currency: str(raw.currency) ?? 'EUR',
    bedrooms: num(raw.bedrooms) != null ? Math.round(num(raw.bedrooms)!) : null,
    bathrooms: num(raw.bathrooms) != null ? Math.round(num(raw.bathrooms)!) : null,
    rooms: num(raw.rooms) != null ? Math.round(num(raw.rooms)!) : null,
    sizeSqm: num(raw.sizeSqm),
    surfaceSqm: num(raw.surfaceSqm),
    landSqm: num(raw.landSqm),
    floor: str(raw.floor),
    totalFloors: num(raw.totalFloors) != null ? Math.round(num(raw.totalFloors)!) : null,
    yearBuilt: num(raw.yearBuilt) != null ? Math.round(num(raw.yearBuilt)!) : null,
    yearRenovated: num(raw.yearRenovated) != null ? Math.round(num(raw.yearRenovated)!) : null,
    energyClass: str(raw.energyClass),
    energyPerformanceKwhM2Y: num(raw.energyPerformanceKwhM2Y),
    foglio: str(raw.foglio),
    particella: str(raw.particella),
    subalterno: str(raw.subalterno),
    condition: str(raw.condition),
    features: Array.isArray(raw.features) ? raw.features.map(String) : [],
    city: str(raw.city),
    province: str(raw.province),
    address: str(raw.address),
    latitude: num(raw.latitude),
    longitude: num(raw.longitude),
    photoUrls: photoUrlsFromListing(raw),
  };
}

export function listingShowsSale(types: TransactionTypeSlug[], primary: TransactionTypeSlug | null): boolean {
  return types.includes('sale') || primary === 'sale' || primary === 'auction' || primary === 'bare_ownership';
}

export function listingShowsRent(types: TransactionTypeSlug[], primary: TransactionTypeSlug | null): boolean {
  return types.includes('rent') || primary === 'rent';
}

export function pricePerSqm(price: number | null, sizeSqm: number | null): number | null {
  if (price == null || sizeSqm == null || sizeSqm <= 0) return null;
  return Math.round(price / sizeSqm);
}
