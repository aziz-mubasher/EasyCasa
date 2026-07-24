import { describe, expect, it } from 'vitest';

import type { AreaValuationBandData } from './area-valuation.port';
import { buildValuationBand, unavailableBand } from './valuation-band';

function zone(over: Partial<AreaValuationBandData> = {}): AreaValuationBandData {
  return {
    minPerM2Cents: 122_000,
    avgPerM2Cents: 131_300,
    maxPerM2Cents: 141_000,
    source: 'comparable_listings',
    period: '2026-H1',
    zoneLabel: 'Brescia, BS',
    attribution: null,
    geoLevel: 'comune',
    provisional: true,
    comparableCount: 5,
    ...over,
  };
}

describe('valuation band math', () => {
  it('derives anchor totals from zone €/m² × surface', () => {
    const band = buildValuationBand(120, zone(), null);
    expect(band.anchors.selling.perM2Cents).toBe(122_000);
    expect(band.anchors.selling.totalCents).toBe(Math.round(122_000 * 120));
    expect(band.anchors.fairMarket.totalCents).toBe(Math.round(131_300 * 120));
    expect(band.anchors.outOfMarket.totalCents).toBe(Math.round(141_000 * 120));
  });

  it('positions the asking marker on the €/m² scale', () => {
    const band = buildValuationBand(100, zone(), 200_000);
    expect(band.asking?.perM2Cents).toBe(200_000);
    expect(band.asking?.side).toBe('above');
    expect(band.asking?.clamped).toBe(true);
    expect(band.asking?.positionPct).toBe(100);
  });

  it('marks below-min asking as clamped at the low end', () => {
    const band = buildValuationBand(100, zone(), 100_000);
    expect(band.asking?.side).toBe('below');
    expect(band.asking?.positionPct).toBe(0);
    expect(band.asking?.clamped).toBe(true);
  });

  it('in-band asking is not clamped', () => {
    const band = buildValuationBand(100, zone(), 130_000);
    expect(band.asking?.side).toBe('in_band');
    expect(band.asking?.clamped).toBe(false);
    expect(band.asking!.positionPct).toBeGreaterThan(0);
    expect(band.asking!.positionPct).toBeLessThan(100);
  });

  it('omits asking marker when price is missing', () => {
    const band = buildValuationBand(90, zone(), null);
    expect(band.asking).toBeNull();
  });

  it('unavailable helper returns typed reason', () => {
    expect(unavailableBand('missing_surface')).toEqual({
      status: 'unavailable',
      reason: 'missing_surface',
    });
  });
});
