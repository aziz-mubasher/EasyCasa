import { describe, expect, it } from 'vitest';
import {
  deriveLegacyCategorySlug,
  mapLegacyCategoryToAxes,
} from '@easycasa/shared';

describe('taxonomy mapping', () => {
  it('maps legacy categories onto axes', () => {
    expect(mapLegacyCategoryToAxes('residential')).toEqual({ assetClass: 'residential' });
    expect(mapLegacyCategoryToAxes('renovatable')).toEqual({
      assetClass: 'residential',
      condition: 'to_renovate',
    });
    expect(mapLegacyCategoryToAxes('new-build')).toEqual({
      assetClass: 'residential',
      financingOptions: ['rent_to_buy'],
    });
    expect(mapLegacyCategoryToAxes('auction')).toEqual({
      transactionType: 'auction',
      assetClass: 'residential',
    });
    expect(mapLegacyCategoryToAxes('rooms')).toEqual({
      assetClass: 'residential',
      propertyType: 'room',
    });
  });

  it('derives legacy categorySlug for URL compat', () => {
    expect(deriveLegacyCategorySlug({ transactionType: 'auction' })).toBe('auction');
    expect(deriveLegacyCategorySlug({ propertyType: 'room' })).toBe('rooms');
    expect(deriveLegacyCategorySlug({ financingOptions: ['rent_to_buy'] })).toBe('new-build');
    expect(deriveLegacyCategorySlug({ condition: 'to_renovate' })).toBe('renovatable');
    expect(deriveLegacyCategorySlug({ assetClass: 'commercial' })).toBe('commercial');
    expect(deriveLegacyCategorySlug({ assetClass: 'residential' })).toBe('residential');
  });
});
