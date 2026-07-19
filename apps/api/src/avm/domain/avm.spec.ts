import { describe, expect, it } from 'vitest';

import { adjustCompToSubject } from './adjustments';
import { distanceKm, selectComparables } from './comparables';
import { computeEstimate, InsufficientDataError } from './estimate';
import type { Comparable, SubjectProperty } from './types';

function subject(over: Partial<SubjectProperty> = {}): SubjectProperty {
  return {
    comune: 'Milano',
    provincia: 'MI',
    lat: 45.4642,
    lng: 9.19,
    type: 'apartment',
    areaM2: 90,
    rooms: 3,
    floor: 2,
    energyClass: 'C',
    condition: 'good',
    yearBuilt: 1980,
    ...over,
  };
}

function comp(over: Partial<Comparable> = {}): Comparable {
  return {
    id: 'c',
    lat: 45.4645,
    lng: 9.191,
    type: 'apartment',
    areaM2: 88,
    pricePerM2Cents: 400_000,
    energyClass: 'C',
    floor: 2,
    condition: 'good',
    soldMonthsAgo: 6,
    ...over,
  };
}

describe('AVM adjustments', () => {
  it('a better-energy subject lifts a comp’s adjusted €/m²', () => {
    const base = adjustCompToSubject(comp({ energyClass: 'C' }), subject({ energyClass: 'C' }));
    const better = adjustCompToSubject(comp({ energyClass: 'C' }), subject({ energyClass: 'A2' }));
    expect(better).toBeGreaterThan(base);
  });

  it('to-renovate subject lowers the adjusted €/m² vs a renovated comp', () => {
    const adj = adjustCompToSubject(comp({ condition: 'renovated' }), subject({ condition: 'to_renovate' }));
    expect(adj).toBeLessThan(comp({ condition: 'renovated' }).pricePerM2Cents);
  });

  it('unknown feature on either side → no adjustment for it', () => {
    expect(
      adjustCompToSubject(comp({ energyClass: null }), subject({ energyClass: null, condition: 'good', floor: 2 })),
    ).toBe(400_000);
  });
});

describe('AVM selection', () => {
  it('selectComparables filters type, size, recency, distance', () => {
    const comps = [
      comp({ id: 'ok' }),
      comp({ id: 'wrongType', type: 'villa' }),
      comp({ id: 'tooBig', areaM2: 200 }),
      comp({ id: 'stale', soldMonthsAgo: 40 }),
      comp({ id: 'faraway', lat: 44.0, lng: 8.0 }),
    ];
    expect(selectComparables(subject(), comps).map((c) => c.id)).toEqual(['ok']);
  });

  it('distanceKm is ~0 for identical points and positive otherwise', () => {
    expect(distanceKm(45.46, 9.19, 45.46, 9.19)).toBeLessThan(1e-9);
    expect(distanceKm(45.46, 9.19, 45.50, 9.19)).toBeGreaterThan(1);
  });
});

describe('AVM estimate', () => {
  it('enough comps → comparables basis with a sane range', () => {
    const comps = [
      comp({ id: 'a', pricePerM2Cents: 400_000 }),
      comp({ id: 'b', pricePerM2Cents: 420_000 }),
      comp({ id: 'c', pricePerM2Cents: 410_000 }),
    ];
    const e = computeEstimate(subject(), comps);
    expect(e.basis).toBe('comparables');
    expect(e.minCents).toBeLessThan(e.pointCents);
    expect(e.pointCents).toBeLessThan(e.maxCents);
    expect(e.pointCents).toBeGreaterThan(35_000_000 - 1);
    expect(e.pointCents).toBeLessThan(39_000_000);
    expect(e.comparablesUsed).toBe(3);
  });

  it('sparse comps + OMI → omi basis with band-derived range', () => {
    const omi = { minPerM2Cents: 350_000, maxPerM2Cents: 450_000 };
    const e = computeEstimate(subject(), [comp()], omi);
    expect(e.basis).toBe('omi');
    expect(e.minCents).toBe(Math.round(350_000 * 90));
    expect(e.maxCents).toBe(Math.round(450_000 * 90));
    expect(e.confidence).toBe('low');
  });

  it('OMI blend pulls an out-of-band comps estimate toward the band', () => {
    const hot = [
      comp({ id: 'a', pricePerM2Cents: 700_000 }),
      comp({ id: 'b', pricePerM2Cents: 720_000 }),
      comp({ id: 'c', pricePerM2Cents: 710_000 }),
    ];
    const omi = { minPerM2Cents: 300_000, maxPerM2Cents: 500_000 };
    const blended = computeEstimate(subject(), hot, omi);
    const pure = computeEstimate(subject(), hot);
    expect(blended.basis).toBe('blended');
    expect(blended.pricePerM2Cents).toBeLessThan(pure.pricePerM2Cents);
    expect(blended.pricePerM2Cents).toBeGreaterThan(omi.maxPerM2Cents);
  });

  it('high confidence needs many tight comps', () => {
    const tight = Array.from({ length: 9 }, (_, i) =>
      comp({ id: `t${i}`, pricePerM2Cents: 410_000 + (i % 2) * 2000 }),
    );
    expect(computeEstimate(subject(), tight).confidence).toBe('high');
  });

  it('no comps and no OMI → InsufficientDataError', () => {
    expect(() => computeEstimate(subject(), [])).toThrow(InsufficientDataError);
  });
});
