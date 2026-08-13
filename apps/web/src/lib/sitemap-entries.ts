import type { MetadataRoute } from 'next';
import { sellPrivatelyPath } from '@/lib/sell-privately';
import { sellerInboxEnabled } from '@/lib/seller-inbox-config';

const LOCALES = ['it', 'en', 'es'] as const;

type ListingRef = { slug: string; updatedAt: string };

/**
 * Honest content-change dates (ISO calendar days). Update when page copy or structure
 * materially changes — never use build-time "now" for static marketing pages (T33).
 */
export const STATIC_PAGE_LASTMOD: Record<string, string> = {
  '': '2026-08-12',
  '/search': '2026-07-25',
  '/add': '2026-08-11',
  '/pricing': '2026-07-26',
  '/acquisto-assistito': '2026-07-27',
  '/for-buyers': '2026-08-02',
  '/about': '2026-08-02',
  '/valutazione-gratuita': '2026-07-28',
  '/vendi-da-privato': '2026-08-10',
  '/legal/privacy': '2026-07-29',
  '/legal/terms': '2026-07-29',
  '/legal/mediation': '2026-07-29',
  '/privacy': '2026-07-29',
  '/contatti': '2026-07-29',
  '/trasparenza': '2026-07-29',
  '/agenzie': '2026-07-29',
  '/banks4all': '2026-08-02',
};

/** Routes that stay out of the sitemap while dark flags are off. */
export const SITEMAP_EXCLUDED_WHEN_DARK: ReadonlyArray<{
  path: string;
  enabled: () => boolean;
}> = [{ path: '/seller/enquiries', enabled: sellerInboxEnabled }];

export function isSitemapExcludedPath(path: string): boolean {
  return SITEMAP_EXCLUDED_WHEN_DARK.some((r) => path.startsWith(r.path) && !r.enabled());
}

export function staticPageLastModified(path: string): Date {
  const iso = STATIC_PAGE_LASTMOD[path] ?? STATIC_PAGE_LASTMOD[''];
  return new Date(`${iso}T00:00:00.000Z`);
}

export function buildStaticSitemapEntries(site: string): MetadataRoute.Sitemap {
  const staticPaths = Object.keys(STATIC_PAGE_LASTMOD);

  return LOCALES.flatMap((loc) =>
    staticPaths
      .filter((p) => !isSitemapExcludedPath(p))
      .map((p) => {
        const pathFor = (l: (typeof LOCALES)[number]) =>
          p === '/vendi-da-privato' ? sellPrivatelyPath(l) : p;
        return {
          url: `${site}/${loc}${pathFor(loc)}`,
          lastModified: staticPageLastModified(p),
          changeFrequency: p === '' ? ('daily' as const) : ('weekly' as const),
          priority: p === '' ? 1 : p === '/vendi-da-privato' ? 0.8 : 0.7,
          alternates: {
            languages: Object.fromEntries(LOCALES.map((l) => [l, `${site}/${l}${pathFor(l)}`])),
          },
        };
      }),
  );
}

export function buildListingSitemapEntries(
  listings: readonly ListingRef[],
  site: string,
): MetadataRoute.Sitemap {
  return listings.flatMap((l) =>
    LOCALES.map((loc) => ({
      url: `${site}/${loc}/listings/${l.slug}`,
      lastModified: new Date(l.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((locale) => [locale, `${site}/${locale}/listings/${l.slug}`]),
        ),
      },
    })),
  );
}
