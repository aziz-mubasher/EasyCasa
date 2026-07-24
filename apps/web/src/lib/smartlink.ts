import type { ValuationBandResponseDto } from '@/lib/valuation-band';
import { apiUrl } from '@/auth/authedFetch';

export interface SmartLinkPublicPayload {
  token: string;
  includeValuationBand: boolean;
  stats: { viewCount: number; uniqueViewCount: number };
  agent: {
    displayName: string | null;
    phone: string | null;
    bio: string | null;
    slug: string | null;
  };
  agency: {
    name: string;
    email: string;
    phone: string | null;
  };
  listing: {
    title: string;
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
    energyClass: string | null;
    features: string[];
    status: string;
    media: Array<{
      url: string;
      alt: string | null;
      width: number | null;
      height: number | null;
      position: number;
    }>;
    coverUrl: string | null;
  };
  valuationBand?: ValuationBandResponseDto;
}

export interface ShareLinkOwnerDto {
  id: string;
  token: string;
  listingId: string;
  listingTitle: string;
  listingSlug: string | null;
  includeValuationBand: boolean;
  viewCount: number;
  uniqueViewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  publicPath: string;
}

const BASE =
  (typeof window === 'undefined' ? process.env.API_URL : process.env.NEXT_PUBLIC_API_URL) ??
  'http://localhost/api';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';

export function smartLinkPublicUrl(token: string, locale = 'it'): string {
  return `${SITE}/${locale}/s/${token}`;
}

export async function fetchSmartLinkPublic(
  token: string,
  visitorId?: string | null,
): Promise<{ data: SmartLinkPublicPayload | null; status: number }> {
  const headers: HeadersInit = { Accept: 'application/json' };
  if (visitorId) headers['X-EC-SL-Viewer'] = visitorId;

  const res = await fetch(`${BASE}/share-links/public/${encodeURIComponent(token)}`, {
    cache: 'no-store',
    headers,
  });

  if (res.status === 404 || res.status === 410) {
    return { data: null, status: res.status };
  }
  if (!res.ok) throw new Error(`smartlink failed: ${res.status}`);
  const data = (await res.json()) as SmartLinkPublicPayload;
  return { data, status: res.status };
}

export async function createShareLink(
  authedFetch: typeof fetch,
  listingId: string,
  includeValuationBand: boolean,
): Promise<ShareLinkOwnerDto> {
  const res = await authedFetch(apiUrl('/share-links'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId, includeValuationBand }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ShareLinkOwnerDto>;
}

export async function listMyShareLinks(authedFetch: typeof fetch): Promise<ShareLinkOwnerDto[]> {
  const res = await authedFetch(apiUrl('/share-links/mine'));
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ShareLinkOwnerDto[]>;
}

export async function revokeShareLink(authedFetch: typeof fetch, id: string): Promise<void> {
  const res = await authedFetch(apiUrl(`/share-links/${id}/revoke`), {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await res.text());
}

export const SMARTLINK_VISITOR_COOKIE = 'ec_sl_vid';
