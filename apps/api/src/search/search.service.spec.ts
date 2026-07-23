import { describe, expect, it } from 'vitest';

import { SearchService } from './search.service';

describe('SearchService', () => {
  const svc = new SearchService();

  describe('normalizePriceRange', () => {
    it('swaps inverted min/max gracefully', () => {
      expect(svc.normalizePriceRange(500000, 100000)).toEqual({ min: 100000, max: 500000 });
    });

    it('passes through valid ranges', () => {
      expect(svc.normalizePriceRange(100000, 500000)).toEqual({ min: 100000, max: 500000 });
    });

    it('supports open-ended ranges', () => {
      expect(svc.normalizePriceRange(undefined, 300000)).toEqual({ min: undefined, max: 300000 });
      expect(svc.normalizePriceRange(200000, undefined)).toEqual({ min: 200000, max: undefined });
    });
  });
});
