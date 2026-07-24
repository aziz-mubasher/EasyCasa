import { describe, expect, it, vi } from 'vitest';

import type { AreaValuationBandData, AreaValuationQuery } from './domain/area-valuation.port';
import { FallbackAreaValuationProvider } from './fallback-area-valuation.provider';
import { OmiAreaValuationProvider } from './omi-area-valuation.provider';
import { StubAreaValuationProvider } from './stub-area-valuation.provider';

function omiBand(): AreaValuationBandData {
  return {
    minPerM2Cents: 850_000,
    avgPerM2Cents: 925_000,
    maxPerM2Cents: 1_000_000,
    source: 'omi',
    period: '2025-H2',
    zoneLabel: 'Comune di Milano (livello comunale), MI',
    attribution: 'Fonte: Agenzia delle Entrate – OMI',
    geoLevel: 'comune',
    provisional: false,
    comparableCount: 0,
  };
}

function stubBand(): AreaValuationBandData {
  return {
    minPerM2Cents: 100_000,
    avgPerM2Cents: 110_000,
    maxPerM2Cents: 120_000,
    source: 'comparable_listings',
    period: '2026-H1',
    zoneLabel: 'Milano, MI',
    attribution: null,
    geoLevel: 'comune',
    provisional: true,
    comparableCount: 4,
  };
}

describe('FallbackAreaValuationProvider', () => {
  const query: AreaValuationQuery = {
    comune: 'Milano',
    provincia: 'MI',
    propertyType: 'apartment',
  };

  it('returns OMI band with correct source when OMI has coverage', async () => {
    const omi = { bandForArea: vi.fn().mockResolvedValue(omiBand()) } as unknown as OmiAreaValuationProvider;
    const stub = { bandForArea: vi.fn().mockResolvedValue(stubBand()) } as unknown as StubAreaValuationProvider;
    const provider = new FallbackAreaValuationProvider(omi, stub);
    const band = await provider.bandForArea(query);
    expect(band?.source).toBe('omi');
    expect(band?.provisional).toBe(false);
    expect(band?.attribution).toContain('Agenzia delle Entrate');
    expect(stub.bandForArea).not.toHaveBeenCalled();
  });

  it('falls back to stub when OMI returns null', async () => {
    const omi = { bandForArea: vi.fn().mockResolvedValue(null) } as unknown as OmiAreaValuationProvider;
    const stub = { bandForArea: vi.fn().mockResolvedValue(stubBand()) } as unknown as StubAreaValuationProvider;
    const provider = new FallbackAreaValuationProvider(omi, stub);
    const band = await provider.bandForArea(query);
    expect(band?.source).toBe('comparable_listings');
    expect(band?.provisional).toBe(true);
    expect(band?.source).not.toBe('omi');
  });
});

describe('OmiAreaValuationProvider midpoint', () => {
  it('derives avg as midpoint of min/max (OMI convention)', () => {
    const band = omiBand();
    expect(band.avgPerM2Cents).toBe(Math.round((band.minPerM2Cents + band.maxPerM2Cents) / 2));
  });
});
