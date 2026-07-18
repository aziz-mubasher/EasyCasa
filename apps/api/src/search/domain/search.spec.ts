import { describe, expect, it } from 'vitest';

import {
  bboxOfPolygon,
  inBBox,
  InvalidBBoxError,
  pointInPolygon,
  validateBBox,
} from './geo';
import { cellSizeForZoom, clusterPins } from './cluster';
import { buildIndexFilters, matchesFilters } from './filters';
import type { ListingPin } from './types';

const milanBox = { minLat: 45.4, minLng: 9.1, maxLat: 45.5, maxLng: 9.25 };

function pin(id: string, lat: number, lng: number): ListingPin {
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
  };
}

describe('geo', () => {
  it('inBBox', () => {
    expect(inBBox({ lat: 45.46, lng: 9.19 }, milanBox)).toBe(true);
    expect(inBBox({ lat: 41.9, lng: 12.5 }, milanBox)).toBe(false);
  });

  it('validateBBox rejects inverted / out-of-range boxes', () => {
    expect(() =>
      validateBBox({ minLat: 46, minLng: 9, maxLat: 45, maxLng: 10 }),
    ).toThrow(InvalidBBoxError);
    expect(() =>
      validateBBox({ minLat: 0, minLng: 0, maxLat: 0, maxLng: 200 }),
    ).toThrow(InvalidBBoxError);
  });

  it('pointInPolygon: inside vs outside a square', () => {
    const square = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 10 },
      { lat: 10, lng: 10 },
      { lat: 10, lng: 0 },
    ];
    expect(pointInPolygon({ lat: 5, lng: 5 }, square)).toBe(true);
    expect(pointInPolygon({ lat: 15, lng: 5 }, square)).toBe(false);
    expect(pointInPolygon({ lat: 5, lng: 20 }, square)).toBe(false);
  });

  it('bboxOfPolygon', () => {
    expect(
      bboxOfPolygon([
        { lat: 1, lng: 2 },
        { lat: 5, lng: -1 },
        { lat: 3, lng: 4 },
      ]),
    ).toEqual({ minLat: 1, maxLat: 5, minLng: -1, maxLng: 4 });
  });
});

describe('clustering', () => {
  it('cell size halves as zoom increases', () => {
    expect(cellSizeForZoom(4)).toBeGreaterThan(cellSizeForZoom(8));
    expect(cellSizeForZoom(1)).toBe(180);
  });

  it('nearby pins merge at low zoom, split at high zoom', () => {
    const pins = [pin('a', 45.4, 9.1), pin('b', 45.41, 9.11), pin('c', 45.9, 9.9)];
    const low = clusterPins(pins, 6);
    expect(low.reduce((s, c) => s + c.count, 0)).toBe(3);
    expect(low.length).toBeLessThan(3);

    const high = clusterPins(pins, 16);
    expect(high).toHaveLength(3);
    expect(high.every((c) => c.count === 1 && c.listingId !== null)).toBe(true);
  });

  it('a lone pin becomes a singleton cluster carrying its id', () => {
    const [c] = clusterPins([pin('solo', 45, 9)], 8);
    expect(c?.count).toBe(1);
    expect(c?.listingId).toBe('solo');
  });

  it('cluster centroid is the average of its pins', () => {
    const [c] = clusterPins([pin('a', 45.0, 9.0), pin('b', 45.02, 9.02)], 8);
    expect(Math.abs((c?.lat ?? 0) - 45.01)).toBeLessThan(1e-9);
  });
});

describe('filters', () => {
  it('matchesFilters: price, type, rooms, energy', () => {
    const p = pin('x', 45, 9);
    expect(matchesFilters(p, { priceMaxCents: 40_000_000 })).toBe(true);
    expect(matchesFilters(p, { priceMaxCents: 20_000_000 })).toBe(false);
    expect(matchesFilters(p, { types: ['house'] })).toBe(false);
    expect(matchesFilters(p, { types: ['apartment', 'house'] })).toBe(true);
    expect(matchesFilters(p, { minRooms: 4 })).toBe(false);
    expect(matchesFilters(p, { energyClasses: ['A1', 'B'] })).toBe(false);
    expect(matchesFilters(p, { energyClasses: ['C'] })).toBe(true);
  });

  it('buildIndexFilters emits AND clauses with OR groups', () => {
    const clauses = buildIndexFilters({
      dealType: 'sale',
      priceMaxCents: 50_000_000,
      types: ['apartment', 'villa'],
    });
    expect(clauses).toContain('transactionType = "sale"');
    expect(clauses).toContain('price <= 500000');
    expect(clauses.some((c) => c.startsWith('(') && c.includes('OR'))).toBe(true);
  });
});
