import { describe, expect, it } from 'vitest';

import { listingMatchesSavedSearch, matchingListings } from './match';
import { buildDigest, selectToNotify } from './notify';
import type { ListingPin, SavedSearchCriteria } from './types';

function pin(id: string, lat: number, lng: number, over: Partial<ListingPin> = {}): ListingPin {
  return {
    listingId: id,
    lat,
    lng,
    priceCents: 30_000_000,
    dealType: 'sale',
    type: 'apartment',
    rooms: 3,
    areaM2: 90,
    energyClass: 'C',
    title: id,
    thumbnailUrl: null,
    ...over,
  };
}

const milanArea: SavedSearchCriteria = {
  filters: { dealType: 'sale', priceMaxCents: 40_000_000 },
  bbox: { minLat: 45.4, minLng: 9.1, maxLat: 45.5, maxLng: 9.25 },
};

describe('saved-search match + notify', () => {
  it('matches when inside bbox and passing filters', () => {
    expect(listingMatchesSavedSearch(pin('a', 45.46, 9.19), milanArea)).toBe(true);
  });

  it('no match when outside the saved area', () => {
    expect(listingMatchesSavedSearch(pin('rome', 41.9, 12.5), milanArea)).toBe(false);
  });

  it('no match when a filter fails (too expensive)', () => {
    expect(
      listingMatchesSavedSearch(pin('pricey', 45.46, 9.19, { priceCents: 90_000_000 }), milanArea),
    ).toBe(false);
  });

  it('polygon area is honoured over bbox', () => {
    const poly: SavedSearchCriteria = {
      filters: {},
      polygon: [
        { lat: 45.45, lng: 9.18 },
        { lat: 45.45, lng: 9.2 },
        { lat: 45.47, lng: 9.2 },
        { lat: 45.47, lng: 9.18 },
      ],
    };
    expect(listingMatchesSavedSearch(pin('in', 45.46, 9.19), poly)).toBe(true);
    expect(listingMatchesSavedSearch(pin('out', 45.4, 9.19), poly)).toBe(false);
  });

  it('area-less saved search matches on filters alone', () => {
    const anywhere: SavedSearchCriteria = { filters: { dealType: 'rent' } };
    expect(listingMatchesSavedSearch(pin('r', 0, 0, { dealType: 'rent' }), anywhere)).toBe(true);
    expect(listingMatchesSavedSearch(pin('s', 0, 0, { dealType: 'sale' }), anywhere)).toBe(false);
  });

  it('matchingListings filters a batch', () => {
    const batch = [pin('a', 45.46, 9.19), pin('rome', 41.9, 12.5), pin('b', 45.45, 9.15)];
    expect(matchingListings(batch, milanArea).map((l) => l.listingId)).toEqual(['a', 'b']);
  });

  it('selectToNotify: off sends nothing', () => {
    expect(selectToNotify('off', [], ['a', 'b'])).toEqual([]);
  });

  it('selectToNotify: dedups against already-notified and within batch', () => {
    expect(selectToNotify('instant', ['a'], ['a', 'b', 'b', 'c'])).toEqual(['b', 'c']);
  });

  it('buildDigest caps items and reports total', () => {
    const pins = Array.from({ length: 25 }, (_, i) => pin(`x${i}`, 45.46, 9.19));
    const d = buildDigest({ id: 'ss1', name: 'Milano centro' }, pins, 20);
    expect(d.items).toHaveLength(20);
    expect(d.total).toBe(25);
    expect(d.savedSearchName).toBe('Milano centro');
  });
});
