import { describe, expect, it } from 'vitest';

import { buildOmiCheck } from './aste-omi-check';
import { mapAsteToOmiCodTip } from './map-aste-to-omi-cod-tip';

describe('mapAsteToOmiCodTip', () => {
  it('maps apartment tipologia', () => {
    const m = mapAsteToOmiCodTip({ tipologia: 'Appartamento', categoria_catastale: null });
    expect(m.codTip).toBe(20);
    expect(m.usedGeneric).toBe(false);
  });

  it('maps A/7 to villa', () => {
    const m = mapAsteToOmiCodTip({ tipologia: null, categoria_catastale: 'A/7' });
    expect(m.codTip).toBe(1);
    expect(m.propertyType).toBe('villa');
  });

  it('falls back to residential generic', () => {
    const m = mapAsteToOmiCodTip({ tipologia: 'xyz', categoria_catastale: null });
    expect(m.codTip).toBe(20);
    expect(m.usedGeneric).toBe(true);
  });
});

describe('buildOmiCheck', () => {
  const tip = {
    codTip: 20,
    propertyType: 'apartment',
    usedGeneric: false,
    matchedOn: 'tipologia',
    source: 'appartamento',
  };

  it('computes total range and sconto when superficie known', () => {
    const r = buildOmiCheck({
      method: 'comune',
      confidence: 'medium',
      comuneNormalized: 'MILANO',
      provinciaNormalized: 'MI',
      tip,
      band: {
        minEurSqm: 2000,
        maxEurSqm: 3000,
        period: '2024_2',
        linkZona: null,
        attribution: 'Fonte: OMI — Agenzia delle Entrate',
      },
      superficieMq: 100,
      prezzoBase: 200_000,
      valoreStima: 250_000,
    });
    expect(r.available).toBe(true);
    expect(r.omi_range_unit).toBe('total_eur');
    expect(r.omi_range).toEqual({ min: 200_000, max: 300_000, mid: 250_000 });
    expect(r.sconto_reale_pct).toBe(20);
    expect(r.prezzo_base_vs_omi_pct).toBe(-20);
  });

  it('returns unavailable with warnings when comune unmatched', () => {
    const r = buildOmiCheck({
      method: null,
      confidence: null,
      comuneNormalized: 'NOWHERE',
      provinciaNormalized: 'MI',
      tip,
      band: null,
      superficieMq: 80,
      prezzoBase: 100_000,
      valoreStima: null,
    });
    expect(r.available).toBe(false);
    expect(r.omi_range).toBeNull();
    expect(r.warnings).toContain('comune_unmatched_or_no_omi_band');
  });

  it('flags eur_per_mq when superficie missing', () => {
    const r = buildOmiCheck({
      method: 'zone',
      confidence: 'high',
      comuneNormalized: 'MILANO',
      provinciaNormalized: 'MI',
      tip,
      band: {
        minEurSqm: 1000,
        maxEurSqm: 2000,
        period: '2024_1',
        linkZona: 'Z1',
        attribution: 'Fonte: OMI — Agenzia delle Entrate',
      },
      superficieMq: null,
      prezzoBase: 150_000,
      valoreStima: null,
    });
    expect(r.omi_range_unit).toBe('eur_per_mq');
    expect(r.sconto_reale_pct).toBeNull();
    expect(r.warnings).toContain('superficie_missing_eur_per_mq_only');
  });
});
