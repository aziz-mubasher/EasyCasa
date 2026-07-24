import type { listings } from '../../db/schema';
import type { media } from '../../db/schema';

type ListingRow = typeof listings.$inferSelect;
type MediaRow = Pick<
  typeof media.$inferSelect,
  'url' | 'type' | 'alt' | 'position' | 'width' | 'height'
>;

export interface AgentSnapshot {
  displayName: string;
  phone?: string | null;
  slug?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

/** Fields intentionally exposed on the public SmartLink (marketing-safe). */
export interface PublicShareListing {
  slug: string;
  title: string;
  description: string | null;
  city: string | null;
  province: string | null;
  transactionType: string | null;
  transactionTypes: string[];
  price: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  rooms: number | null;
  sizeSqm: number | null;
  surfaceSqm: number | null;
  yearBuilt: number | null;
  yearRenovated: number | null;
  energyClass: string | null;
  propertyType: string | null;
  condition: string | null;
  features: string[];
  coverUrl: string | null;
  media: Array<{ url: string; alt: string | null }>;
}

export interface PublicSharePayload {
  token: string;
  includeValuationBand: boolean;
  viewCount: number;
  uniqueViewCount: number;
  agent: AgentSnapshot;
  agency: {
    name: string;
    email: string;
    phone: string | null;
  };
  listing: PublicShareListing;
}

const WITHHELD = [
  'address',
  'postalCode',
  'foglio',
  'particella',
  'subalterno',
  'ownerUserId',
  'mediatorUserId',
  'agentId',
  'wpPostId',
  'latitude',
  'longitude',
  'attributes',
  'condominioFeesCents',
  'qrCodeUrl',
  'source',
  'status',
  'id',
] as const;

/** Documented audit: full listing row fields NOT included in PublicShareListing. */
export function withheldListingFields(): readonly string[] {
  return WITHHELD;
}

export function buildPublicShareListing(
  row: ListingRow,
  mediaRows: MediaRow[],
): PublicShareListing {
  const images = mediaRows.filter((m) => m.type === 'image' || m.type === 'floorplan');
  const coverUrl = images[0]?.url ?? null;
  const transactionTypes =
    row.transactionTypes && row.transactionTypes.length > 0
      ? [...row.transactionTypes]
      : row.transactionType
        ? [row.transactionType]
        : [];

  return {
    slug: row.slug ?? row.id,
    title: row.title,
    description: row.description ?? null,
    city: row.city ?? null,
    province: row.province ?? null,
    transactionType: row.transactionType ?? null,
    transactionTypes,
    price: row.price == null ? null : Number(row.price),
    currency: row.currency,
    bedrooms: row.bedrooms ?? null,
    bathrooms: row.bathrooms ?? null,
    rooms: row.rooms ?? row.bedrooms ?? null,
    sizeSqm: row.sizeSqm == null ? null : Number(row.sizeSqm),
    surfaceSqm: row.surfaceSqm == null ? null : Number(row.surfaceSqm),
    yearBuilt: row.yearBuilt ?? null,
    yearRenovated: row.yearRenovated ?? null,
    energyClass: row.energyClass ?? null,
    propertyType: row.propertyType ?? null,
    condition: row.condition ?? null,
    features: row.features ?? [],
    coverUrl,
    media: images.map((m) => ({ url: m.url, alt: m.alt ?? null })),
  };
}
