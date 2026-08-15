/**
 * EC-24-VERIFY — OMI sconto-reale tolerates economics.valore_stima = not_found.
 */
import { describe, expect, it } from 'vitest';

import { buildOmiCheck } from './aste-omi-check';
import {
  fixtureEx2NoPeriziaLotto4,
  fixtureEx2NoPeriziaLotto7,
  fixtureEx7HonestNoStima,
  fixtureStimaNotFoundNoSuperficie,
  fixtureStimaSuspectCleared,
} from './stima-not-found.fixtures';
import type { AsteExtractionV2 } from './extraction-schema';
import { primaryImmobile } from './extraction-schema';
import { mapAsteToOmiCodTip } from './map-aste-to-omi-cod-tip';

const OMI_BAND = {
  minEurSqm: 800,
  maxEurSqm: 1200,
  period: '2024_2',
  linkZona: 'SA-Z1',
  attribution: 'Fonte: OMI — Agenzia delle Entrate',
};

function unwrapStima(ex: AsteExtractionV2): number | null {
  return ex.economics.valore_stima?.value ?? null;
}

function computeFromExtraction(ex: AsteExtractionV2) {
  const imm = primaryImmobile(ex);
  const tip = mapAsteToOmiCodTip({
    tipologia: imm.tipologia,
    categoria_catastale: imm.categoria_catastale,
  });
  return buildOmiCheck({
    method: 'comune',
    confidence: 'medium',
    comuneNormalized: 'NOCERA INFERIORE',
    provinciaNormalized: 'SA',
    tip: {
      codTip: tip.codTip,
      propertyType: tip.propertyType,
      usedGeneric: tip.usedGeneric,
      matchedOn: tip.matchedOn,
      source: tip.source,
    },
    band: OMI_BAND,
    superficieMq: ex.economics.superficie_commerciale_mq?.value ?? null,
    prezzoBase: ex.economics.prezzo_base?.value ?? null,
    valoreStima: unwrapStima(ex),
  });
}

function assertNoBadNumbers(r: ReturnType<typeof buildOmiCheck>) {
  expect(r.valore_stima).toBeNull();
  for (const n of [
    r.sconto_reale_pct,
    r.prezzo_base_vs_omi_pct,
    r.valore_stima_vs_omi_pct,
    r.omi_range?.mid,
  ]) {
    if (n != null) {
      expect(Number.isFinite(n)).toBe(true);
    }
  }
}

describe('EC-24-VERIFY buildOmiCheck — valore_stima not_found', () => {
  const cases: Array<{ name: string; fixture: (id: string) => AsteExtractionV2 }> = [
    { name: 'Ex2 lotto 7 no-perizia', fixture: fixtureEx2NoPeriziaLotto7 },
    { name: 'Ex2 lotto 4 no-perizia', fixture: fixtureEx2NoPeriziaLotto4 },
    { name: 'suspect-cleared stima', fixture: fixtureStimaSuspectCleared },
    { name: 'Ex7 honest no total stima', fixture: fixtureEx7HonestNoStima },
    { name: 'not_found without superficie', fixture: fixtureStimaNotFoundNoSuperficie },
  ];

  for (const { name, fixture } of cases) {
    it(`${name}: no crash; stima null; sconto from prezzo_base only when superficie known`, () => {
      const ex = fixture('avviso-doc-id');
      expect(ex.economics.valore_stima).toBeNull();
      expect(ex.meta.not_found.some((n) => n.includes('valore_stima'))).toBe(true);

      const r = computeFromExtraction(ex);
      assertNoBadNumbers(r);

      expect(r.available).toBe(true);
      expect(r.valore_stima).toBeNull();
      expect(r.valore_stima_vs_omi_pct).toBeNull();
      expect(r.omi_range).not.toBeNull();
      expect(r.omi_eur_mq).toEqual({ min: 800, max: 1200, mid: 1000 });

      if (ex.economics.superficie_commerciale_mq?.value) {
        expect(r.sconto_reale_pct).not.toBeNull();
        expect(r.prezzo_base_vs_omi_pct).not.toBeNull();
        // sconto uses OMI mid vs prezzo_base — never invented stima
        expect(r.sconto_reale_pct).toBeGreaterThan(-100);
        expect(r.sconto_reale_pct).toBeLessThan(100);
      } else {
        expect(r.sconto_reale_pct).toBeNull();
        expect(r.warnings).toContain('superficie_missing_eur_per_mq_only');
      }
    });
  }

  it('suspect-cleared fixture carries valore_stima_suspect warning in meta', () => {
    const ex = fixtureStimaSuspectCleared('av');
    expect(ex.meta.warnings).toContain('valore_stima_suspect');
    const r = computeFromExtraction(ex);
    expect(r.valore_stima).toBeNull();
    expect(r.valore_stima_vs_omi_pct).toBeNull();
  });

  it('derived cauzione on fixture does not affect OMI stima fields', () => {
    const ex = fixtureEx2NoPeriziaLotto7('av');
    expect(ex.economics.cauzione?.derived).toBe(true);
    const r = computeFromExtraction(ex);
    expect(r.valore_stima).toBeNull();
    assertNoBadNumbers(r);
  });

  it('never computes valore_stima_vs_omi when stima absent even with superficie', () => {
    const r = buildOmiCheck({
      method: 'comune',
      confidence: 'medium',
      comuneNormalized: 'MILANO',
      provinciaNormalized: 'MI',
      tip: {
        codTip: 20,
        propertyType: 'apartment',
        usedGeneric: false,
        matchedOn: 'tipologia',
        source: 'appartamento',
      },
      band: OMI_BAND,
      superficieMq: 90,
      prezzoBase: 200_000,
      valoreStima: null,
    });
    expect(r.valore_stima_vs_omi_pct).toBeNull();
    expect(r.sconto_reale_pct).not.toBeNull();
  });
});
