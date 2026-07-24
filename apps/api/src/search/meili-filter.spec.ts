import { describe, expect, it } from 'vitest';

import {
  buildTextSearchFilters,
  escapeMeiliString,
  meiliEqFilter,
  meiliNumericFilter,
} from './meili-filter';

function unescapedQuoteCount(value: string): number {
  let count = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '"' && value[i - 1] !== '\\') count++;
  }
  return count;
}

const INJECTION_PAYLOADS = [
  '" OR status = "draft',
  'foo" AND bar = "x',
  'x\\" OR y = "z',
  'a" OR 1=1 OR "b',
];

describe('meili-filter', () => {
  describe('escapeMeiliString', () => {
    it('escapes double quotes and backslashes', () => {
      expect(escapeMeiliString('Roma "Centro"')).toBe('Roma \\"Centro\\"');
      expect(escapeMeiliString('path\\to')).toBe('path\\\\to');
    });
  });

  describe('meiliEqFilter', () => {
    it('wraps escaped values in a single quoted literal', () => {
      expect(meiliEqFilter('city', 'Milano')).toBe('city = "Milano"');
      expect(meiliEqFilter('city', 'foo" OR bar = "x')).toBe(
        'city = "foo\\" OR bar = \\"x"',
      );
    });

    it.each(INJECTION_PAYLOADS)('keeps payload inside one quoted literal for %j', (payload) => {
      const clause = meiliEqFilter('city', payload);
      expect(clause).toMatch(/^city = ".*"$/);
      expect(unescapedQuoteCount(clause)).toBe(2);
    });
  });

  describe('meiliNumericFilter', () => {
    it('emits finite numbers only', () => {
      expect(meiliNumericFilter('price', '>=', 100000)).toBe('price >= 100000');
    });

    it('rejects non-finite numbers', () => {
      expect(() => meiliNumericFilter('price', '>=', NaN)).toThrow(/Invalid numeric/);
      expect(() => meiliNumericFilter('price', '<=', Infinity)).toThrow(/Invalid numeric/);
    });
  });

  describe('buildTextSearchFilters', () => {
    it('escapes free-text city values', () => {
      const filters = buildTextSearchFilters({ city: 'Roma " OR status = "draft' });
      const cityFilter = filters.find((f) => f.startsWith('city = '));
      expect(cityFilter).toBe('city = "Roma \\" OR status = \\"draft"');
      expect(unescapedQuoteCount(cityFilter ?? '')).toBe(2);
    });

    it('uses validated closed-set values without injection breakout', () => {
      const filters = buildTextSearchFilters({
        categorySlug: 'residential',
        regionSlug: 'lombardia',
        provinceSlug: 'MI',
        transactionType: 'sale',
        energyClass: 'A2',
      });
      expect(filters).toContain('categorySlug = "residential"');
      expect(filters).toContain('regionSlug = "lombardia"');
      expect(filters).toContain('provinceSlug = "MI"');
      expect(filters).toContain('(transactionTypes = "sale" OR transactionType = "sale")');
      expect(filters).toContain('energyClass = "A2"');
    });

    it('coerces numeric filters as numbers, not strings', () => {
      const filters = buildTextSearchFilters({
        minPrice: 100000,
        maxPrice: 500000,
        minBedrooms: 2,
        minBathrooms: 1,
        minSizeSqm: 50,
        maxSizeSqm: 120,
      });
      expect(filters).toContain('price >= 100000');
      expect(filters).toContain('price <= 500000');
      expect(filters).toContain('bedrooms >= 2');
      expect(filters).toContain('bathrooms >= 1');
      expect(filters).toContain('sizeSqm >= 50');
      expect(filters).toContain('sizeSqm <= 120');
    });

    it('always includes published status filter', () => {
      expect(buildTextSearchFilters({})).toEqual(['status = "published"']);
    });
  });
});
