import type { MetadataRoute } from 'next';
import { buildListingSitemapEntries, buildStaticSitemapEntries } from '@/lib/sitemap-entries';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';
const API = process.env.API_URL ?? 'http://api:4000';

type ListingRef = { slug: string; updatedAt: string };

export const revalidate = 3600;

async function fetchListings(): Promise<ListingRef[]> {
  try {
    const res = await fetch(`${API}/listings/sitemap`, { next: { revalidate } });
    if (!res.ok) return [];
    return (await res.json()) as ListingRef[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await fetchListings();
  return [...buildStaticSitemapEntries(SITE), ...buildListingSitemapEntries(listings, SITE)];
}
