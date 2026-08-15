import { describe, expect, it } from 'vitest';

import { buildOmiCheck } from './aste-omi-check';
import { computeSemaforo } from './aste-semaforo';
import { buildTeaserReportPayload, teaserOmiCheck } from './aste-report-teaser';
import { fixtureEx2NoPeriziaLotto7 } from './stima-not-found.fixtures';

describe('aste-report-teaser (EC-27)', () => {
  it('teaserOmiCheck strips valore_stima fields', () => {
    const omi = buildOmiCheck({
      method: 'zone',
      confidence: 'high',
      comuneNormalized: 'MILANO',
      provinciaNormalized: 'MI',
      tip: {
        codTip: 20,
        propertyType: 'A/2',
        usedGeneric: false,
        matchedOn: 'categoria',
        source: 'x',
      },
      band: {
        minEurSqm: 2000,
        maxEurSqm: 3000,
        period: '2026-H1',
        linkZona: null,
        attribution: 'OMI',
      },
      superficieMq: 90,
      prezzoBase: 180_000,
      valoreStima: null,
    });
    const teaser = teaserOmiCheck(omi);
    expect(teaser?.valore_stima).toBeNull();
    expect(teaser?.valore_stima_vs_omi_pct).toBeNull();
    expect(teaser?.omi_range?.mid).toBeGreaterThan(0);
  });

  it('buildTeaserReportPayload omits full-report sections', () => {
    const extraction = fixtureEx2NoPeriziaLotto7('doc-avviso');
    const semaforo = computeSemaforo(extraction);
    const omi = buildOmiCheck({
      method: 'comune',
      confidence: 'medium',
      comuneNormalized: 'X',
      provinciaNormalized: 'MI',
      tip: {
        codTip: 20,
        propertyType: 'A/2',
        usedGeneric: true,
        matchedOn: 'generic',
        source: null,
      },
      band: null,
      superficieMq: null,
      prezzoBase: 100_000,
      valoreStima: null,
    });
    const payload = buildTeaserReportPayload({
      id: 'a1',
      status: 'ready',
      language: 'it',
      register: 'investor',
      tribunale: 'Milano',
      rge: '1/2024',
      lotto: '7',
      lottoLabel: null,
      dataAsta: '2026-01-01',
      extraction,
      semaforo,
      omiCheck: omi,
      entitlement: { monetisationEnabled: true, unlocked: false, creditBalance: 0 },
    });
    expect(payload.viewMode).toBe('teaser');
    expect(payload.criticita).toEqual([]);
    expect(payload.documents).toEqual([]);
    expect(payload.extraction.procedura.termine_offerte).toBeNull();
    expect(payload.semaforoAggregate).toBeTruthy();
    expect(payload.omiCheck?.valore_stima).toBeNull();
  });
});
