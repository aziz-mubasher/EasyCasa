import { describe, expect, it } from 'vitest';
import {
  buildListingSitemapEntries,
  buildStaticSitemapEntries,
  isSitemapExcludedPath,
  staticPageLastModified,
} from './sitemap-entries';
import { sellPrivatelyLanguageAlternates, sellPrivatelyPath } from './sell-privately';

describe('sitemap (T33 honesty + sell-privately locales)', () => {
  const site = 'https://easycasaita.com';

  it('uses fixed lastmod for static pages, not build-time now', () => {
    const home = staticPageLastModified('');
    const sell = staticPageLastModified('/vendi-da-privato');
    expect(home.toISOString()).toBe('2026-08-12T00:00:00.000Z');
    expect(sell.toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });

  it('includes localized sell-privately paths per locale', () => {
    const entries = buildStaticSitemapEntries(site).filter((e) =>
      e.url.includes('vendi-da-privato') ||
      e.url.includes('sell-privately') ||
      e.url.includes('vender-entre-particulares'),
    );
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.url)).toEqual([
      `${site}/it/vendi-da-privato`,
      `${site}/en/sell-privately`,
      `${site}/es/vender-entre-particulares`,
    ]);
    for (const entry of entries) {
      const last = entry.lastModified;
      const iso = last instanceof Date ? last.toISOString() : String(last);
      expect(iso).toBe('2026-08-10T00:00:00.000Z');
    }
  });

  it('listing entries use API updated_at', () => {
    const entries = buildListingSitemapEntries(
      [{ slug: 'test-listing', updatedAt: '2026-06-15T14:30:00.000Z' }],
      site,
    );
    const last = entries[0]!.lastModified;
    const iso = last instanceof Date ? last.toISOString() : String(last);
    expect(iso).toBe('2026-06-15T14:30:00.000Z');
  });

  it('excludes dark seller inbox route while flag is off', () => {
    expect(isSitemapExcludedPath('/seller/enquiries')).toBe(true);
    expect(isSitemapExcludedPath('/search')).toBe(false);
  });

  it('hreflang alternates match sellPrivatelyLanguageAlternates (incl. x-default)', () => {
    const entry = buildStaticSitemapEntries(site).find((e) => e.url.endsWith('/it/vendi-da-privato'));
    expect(entry?.alternates?.languages).toEqual({
      it: sellPrivatelyLanguageAlternates(site).it,
      en: sellPrivatelyLanguageAlternates(site).en,
      es: sellPrivatelyLanguageAlternates(site).es,
    });
    expect(sellPrivatelyPath('es')).toBe('/vender-entre-particulares');
    expect(sellPrivatelyLanguageAlternates(site)['x-default']).toBe(
      `${site}/it/vendi-da-privato`,
    );
  });
});
