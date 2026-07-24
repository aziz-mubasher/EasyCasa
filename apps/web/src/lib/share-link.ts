const BASE =
  (typeof window === 'undefined' ? process.env.API_URL : process.env.NEXT_PUBLIC_API_URL) ??
  'http://localhost/api';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';

export interface PublicSharePayload {
  token: string;
  includeValuationBand: boolean;
  viewCount: number;
  uniqueViewCount: number;
  agent: {
    displayName: string;
    phone?: string | null;
    slug?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
  };
  agency: {
    name: string;
    email: string;
    phone: string | null;
  };
  listing: {
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
  };
}

export interface ShareLinkSummary {
  id: string;
  token: string;
  listingId: string;
  includeValuationBand: boolean;
  viewCount: number;
  uniqueViewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  publicPath: string;
}

export async function fetchPublicShare(token: string): Promise<PublicSharePayload | null> {
  const res = await fetch(`${BASE}/share/${encodeURIComponent(token)}`, { cache: 'no-store' });
  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) throw new Error(`share failed: ${res.status}`);
  return res.json() as Promise<PublicSharePayload>;
}

export function absoluteMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const origin = SITE.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${origin}${path}`;
}

export function smartLinkUrl(locale: string, token: string): string {
  const origin = SITE.replace(/\/$/, '');
  return `${origin}/${locale}/s/${token}`;
}

export async function recordShareView(token: string, visitorToken: string): Promise<void> {
  await fetch(`${BASE}/share/${encodeURIComponent(token)}/view`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ visitorToken }),
  });
}

export const SHARE_VISITOR_COOKIE = 'ec_sl_vid';
