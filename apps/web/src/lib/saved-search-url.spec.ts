import { describe, expect, it } from 'vitest';

import {
  buildSavedSearchCriteriaFromUrl,
  readSearchParamsFromUrl,
  searchHrefFromSavedCriteria,
  summarizeSearchParams,
} from './saved-search-url';

describe('saved-search-url', () => {
  it('round-trips webParams to /search href', () => {
    const sp = new URLSearchParams({
      transactionType: 'sale',
      provinceSlug: 'BS',
      maxPrice: '120000',
      minBedrooms: '2',
    });
    const params = readSearchParamsFromUrl(sp);
    const criteria = buildSavedSearchCriteriaFromUrl(params);
    const href = searchHrefFromSavedCriteria(criteria);
    const qs = new URLSearchParams(href.split('?')[1] ?? '');
    expect(qs.get('transactionType')).toBe('sale');
    expect(qs.get('provinceSlug')).toBe('BS');
    expect(qs.get('maxPrice')).toBe('120000');
    expect(qs.get('minBedrooms')).toBe('2');
  });

  it('summarises empty params honestly', () => {
    const summary = summarizeSearchParams(
      {},
      {
        allListings: 'Tutti gli immobili',
        sale: 'Vendita',
        rent: 'Affitto',
        upToPrice: (m) => `fino a €${m}`,
        fromPrice: (m) => `da €${m}`,
        priceRange: (a, b) => `€${a}–€${b}`,
        inLocation: (p) => `a ${p}`,
        bedrooms: (n) => `${n} camere`,
      },
    );
    expect(summary).toBe('Tutti gli immobili');
  });
});
