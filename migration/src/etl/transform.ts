import { META, normalizeTransaction } from './meta-map.js';
import type { MetaBag, RawPost, RawUser } from './extract.js';

export interface ListingRow {
  wp_post_id: number;
  slug: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'sold' | 'archived';
  transaction_type: 'sale' | 'rent' | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  rooms: number | null;
  size_sqm: number | null;
  land_sqm: number | null;
  floor: string | null;
  year_built: number | null;
  energy_class: string | null;
  condition: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  qr_code_url: string | null;
  attributes: Record<string, unknown>;
  wp_author_id: number;
  published_at: string | null;
}

const num = (v?: string): number | null => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const int = (v?: string): number | null => {
  const n = num(v);
  return n == null ? null : Math.round(n);
};
const str = (v?: string): string | null => (v && v.trim() ? v.trim() : null);

/** Pull image URLs out of PremiumPress PHP-serialized `image_array` blobs. */
export function extractGalleryUrls(serialized?: string): { url: string; ord: number }[] {
  if (!serialized) return [];
  const found = serialized.match(/https?:\/\/[^\s"']+\.(?:jpe?g|png|webp)/gi) ?? [];
  const seen = new Set<string>();
  const out: { url: string; ord: number }[] = [];
  for (const raw of found) {
    const url = raw.replace(/\\/g, '');
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, ord: out.length });
  }
  return out;
}

function mapStatus(wp: string): ListingRow['status'] {
  if (wp === 'publish') return 'published';
  if (wp === 'draft' || wp === 'pending') return 'draft';
  return 'archived';
}

export function transformListing(post: RawPost, meta: MetaBag): ListingRow {
  return {
    wp_post_id: post.ID,
    slug: post.post_name || `listing-${post.ID}`,
    title: post.post_title || `Listing ${post.ID}`,
    description: post.post_content ?? '',
    status: mapStatus(post.post_status),
    transaction_type: normalizeTransaction(meta[META.transactionType]),
    price: num(meta[META.price]),
    bedrooms: int(meta[META.bedrooms]),
    bathrooms: int(meta[META.bathrooms]),
    rooms: int(meta[META.rooms]),
    size_sqm: num(meta[META.sizeSqm]),
    land_sqm: num(meta[META.landSqm]),
    floor: str(meta[META.floor]),
    year_built: int(meta[META.yearBuilt]),
    energy_class: str(meta[META.energyClass]),
    condition: str(meta[META.condition]),
    address: str(meta[META.address]),
    city: str(meta[META.city]),
    province: str(meta[META.province]),
    postal_code: str(meta[META.postalCode]),
    latitude: num(meta[META.latitude]),
    longitude: num(meta[META.longitude]),
    qr_code_url: str(meta[META.qrCode]),
    attributes: {
      gallery: extractGalleryUrls(meta[META.gallery]),
      phone: str(meta.phone),
      map_country: str(meta['map-country']),
    },
    wp_author_id: post.post_author,
    published_at: post.post_date_gmt ? `${post.post_date_gmt}Z` : null,
  };
}

export interface UserRow {
  wp_user_id: number;
  email: string | null;
  display_name: string | null;
  slug: string | null;
}

export function transformUser(u: RawUser): UserRow {
  return {
    wp_user_id: u.ID,
    email: str(u.user_email),
    display_name: str(u.display_name),
    slug: str(u.user_nicename),
  };
}
