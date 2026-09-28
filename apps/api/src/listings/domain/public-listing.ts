import type { PublicAgentContact } from './public-contact';
import type { ListingDetail } from './types';

export interface PublicListingMedia {
  url: string;
  type: string;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  position?: number;
}

/** Catalogue columns the public page already reads. Owner ids are not copied. */
export interface PublicListingSource {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  status: string;
  transactionType: string | null;
  transactionTypes: string[] | null;
  price: string | number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  rooms: number | null;
  sizeSqm: string | number | null;
  surfaceSqm: string | number | null;
  landSqm: string | number | null;
  floor: string | null;
  totalFloors: number | null;
  yearBuilt: number | null;
  yearRenovated: number | null;
  energyClass: string | null;
  energyPerformanceKwhM2Y: string | number | null;
  foglio: string | null;
  particella: string | null;
  subalterno: string | null;
  condition: string | null;
  features: string[] | null;
  city: string | null;
  province: string | null;
  address: string | null;
  propertyType: string | null;
  firstPublishedAt: Date | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PublicListingAgent {
  id: string;
  displayName: string;
  phone: string | null;
  slug: string | null;
}

function num(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** One agent object for both the Phase 21 client and the website. No email. */
export function publicListingAgent(contact: PublicAgentContact | null): PublicListingAgent | null {
  if (!contact) return null;
  return {
    id: contact.id,
    displayName: contact.displayName ?? '',
    phone: contact.phone,
    slug: contact.slug,
  };
}

/**
 * Single public listing JSON for UUID and slug.
 * Phase 21 fields (when the row can be assembled) sit beside the catalogue
 * fields the website already parses. `agent` is always the gated contact.
 */
export function toPublicListing(input: {
  row: PublicListingSource;
  media: PublicListingMedia[];
  contact: PublicAgentContact | null;
  boosted: boolean;
  phase21: ListingDetail | null;
}): Record<string, unknown> {
  const imageUrls = input.media
    .filter((m) => m.type === 'image' || m.type === 'floorplan')
    .map((m) => m.url);
  const row = input.row;
  const legacy = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    transactionType: row.transactionType,
    transactionTypes: row.transactionTypes ?? [],
    price: num(row.price),
    currency: row.currency,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    rooms: row.rooms,
    sizeSqm: num(row.sizeSqm),
    surfaceSqm: num(row.surfaceSqm),
    landSqm: num(row.landSqm),
    floor: row.floor,
    totalFloors: row.totalFloors,
    yearBuilt: row.yearBuilt,
    yearRenovated: row.yearRenovated,
    energyClass: row.energyClass,
    energyPerformanceKwhM2Y: num(row.energyPerformanceKwhM2Y),
    foglio: row.foglio,
    particella: row.particella,
    subalterno: row.subalterno,
    condition: row.condition,
    features: row.features ?? [],
    city: row.city,
    province: row.province,
    address: row.address,
    propertyType: row.propertyType,
    firstPublishedAt: row.firstPublishedAt,
    latitude: row.latitude,
    longitude: row.longitude,
    media: input.media,
    imageUrls,
    coverUrl: imageUrls[0] ?? null,
    boosted: input.boosted,
  };
  const agent = publicListingAgent(input.contact);
  if (!input.phase21) return { ...legacy, agent };
  const phaseRest: Record<string, unknown> = { ...input.phase21 };
  delete phaseRest.agent;
  return { ...legacy, ...phaseRest, agent, boosted: input.boosted };
}
