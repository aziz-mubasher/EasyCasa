import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';
const API = process.env.API_URL ?? 'http://api:4000';
const LOCALES = ['it', 'en', 'es'] as const;

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
  const now = new Date();
  const staticPaths = ['', '/search', '/add', '/pricing'];

  const staticEntries: MetadataRoute.Sitemap = LOCALES.flatMap((loc) =>
    staticPaths.map((p) => ({
      url: `${SITE}/${loc}${p}`,
      lastModified: now,
      changeFrequency: p === '' ? 'daily' : 'weekly',
      priority: p === '' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE}/${l}${p}`])),
      },
    })),
  );

  const listings = await fetchListings();
  const listingEntries: MetadataRoute.Sitemap = listings.flatMap((l) =>
    LOCALES.map((loc) => ({
      url: `${SITE}/${loc}/listings/${l.slug}`,
      lastModified: new Date(l.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((locale) => [locale, `${SITE}/${locale}/listings/${l.slug}`]),
        ),
      },
    })),
  );

  return [...staticEntries, ...listingEntries];
}
