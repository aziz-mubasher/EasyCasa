import { describe, expect, it } from 'vitest';

import { buildListingDetail, pricePerM2Cents, toCatastalRef } from './detail';
import { scoreListingQuality } from './quality';
import type { RawListing } from './types';

function raw(over: Partial<RawListing> = {}): RawListing {
  return {
    id: 'l1',
    title: 'Trilocale luminoso in centro',
    description: 'x'.repeat(250),
    dealType: 'sale',
    type: 'apartment',
    status: 'published',
    priceCents: 30_000_000,
    areaM2: 90,
    rooms: 3,
    bathrooms: 2,
    floor: 2,
    totalFloors: 5,
    yearBuilt: 1975,
    energyClass: 'C',
    energyPerformanceKwhM2Y: 120,
    foglio: '12',
    particella: '345',
    subalterno: '6',
    features: ['elevator', 'balcony'],
    condominioFeesCents: 12_000,
    heating: 'autonomo',
    lat: 45.46,
    lng: 9.19,
    address: 'Via Roma 1',
    comune: 'Milano',
    provincia: 'MI',
    photos: Array.from({ length: 8 }, (_, i) => ({ url: `p${i}.jpg`, sortOrder: 8 - i })),
    hasFloorPlan: true,
    agentId: 'pro1',
    agentName: 'Studio Rossi',
    ...over,
  };
}

describe('listing detail domain', () => {
  it('pricePerM2Cents: €300k / 90m² ≈ €3,333.33/m²', () => {
    expect(pricePerM2Cents(30_000_000, 90)).toBe(333_333);
    expect(pricePerM2Cents(30_000_000, 0)).toBeNull();
  });

  it('toCatastalRef formats and returns null when absent', () => {
    expect(
      toCatastalRef({ foglio: '12', particella: '345', subalterno: '6' })?.display,
    ).toBe('Foglio 12, Part. 345, Sub. 6');
    expect(
      toCatastalRef({ foglio: '12', particella: '345', subalterno: null })?.display,
    ).toBe('Foglio 12, Part. 345');
    expect(toCatastalRef({ foglio: null, particella: '3', subalterno: null })).toBeNull();
  });

  it('buildListingDetail: derived fields + sorted photos + energy present', () => {
    const d = buildListingDetail(raw());
    expect(d.pricePerM2Cents).toBe(333_333);
    expect(d.energy.present).toBe(true);
    expect(d.energy.energyClass).toBe('C');
    expect(d.catastal?.display).toBe('Foglio 12, Part. 345, Sub. 6');
    expect(d.photos.map((p) => p.sortOrder).slice(0, 3)).toEqual([1, 2, 3]);
    expect(d.agent?.displayName).toBe('Studio Rossi');
  });

  it('buildListingDetail: no agent → null', () => {
    expect(buildListingDetail(raw({ agentId: null, agentName: null })).agent).toBeNull();
  });

  it('quality: complete listing scores 100', () => {
    expect(scoreListingQuality(raw()).score).toBe(100);
  });

  it('quality: missing photos + energy lowers score and lists gaps', () => {
    const q = scoreListingQuality(
      raw({ photos: [{ url: 'a.jpg', sortOrder: 1 }], energyClass: null }),
    );
    expect(q.score).toBe(100 - 25 - 15);
    expect(q.missing).toContain('photos');
    expect(q.missing).toContain('energyClass');
  });

  it('quality: short description does not count', () => {
    const q = scoreListingQuality(raw({ description: 'too short' }));
    expect(q.missing).toContain('description');
    expect(q.score).toBe(85);
  });
});
