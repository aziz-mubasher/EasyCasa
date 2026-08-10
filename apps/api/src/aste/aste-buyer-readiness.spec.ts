import { describe, expect, it } from 'vitest';

import {
  computeBuyerReadiness,
  emptyBuyerProfile,
  isBuyerProfileSkipped,
} from './aste-buyer-readiness';
import type { AsteExtractionV1 } from './extraction-schema';

function baseEx(modalita: AsteExtractionV1['procedura']['modalita'] = 'telematica'): AsteExtractionV1 {
  return {
    schema_version: 1,
    procedura: {
      tribunale: 'Milano',
      rge: '1/2024',
      lotto: '1',
      giudice_delegato: null,
      data_asta: '2026-09-01',
      termine_offerte: null,
      modalita,
    },
    economics: {
      valore_stima: null,
      prezzo_base: null,
      offerta_minima: null,
      cauzione_pct: null,
      rilancio_minimo: null,
      superficie_commerciale_mq: null,
    },
    immobile: {
      tipologia: null,
      piano: null,
      vani: null,
      locali: [],
      categoria_catastale: null,
      foglio: null,
      particella: null,
      subalterno: null,
      rendita: null,
      indirizzo: null,
      comune: null,
      provincia: null,
    },
    giuridica: {
      diritto_venduto: null,
      stato_occupazione: { stato: null, dettaglio: null, opponibilita: null },
      vincoli: [],
      formalita: [],
    },
    urbanistica: {
      conformita_urbanistica: { stato: null, dettaglio: null },
      conformita_catastale: { stato: null, dettaglio: null },
      difformita: [],
    },
    condizioni: { stato_manutentivo: null, impianti: null, lavori_stimati: null },
    spese: { condominiali_arretrate: null, oneri_acquirente: [] },
    meta: { documents: [], not_found: [], warnings: [], schema_version: 1 },
  };
}

describe('computeBuyerReadiness', () => {
  it('returns unknown when profile skipped', () => {
    expect(isBuyerProfileSkipped(emptyBuyerProfile())).toBe(true);
    const r = computeBuyerReadiness(null, baseEx());
    expect(r.level).toBe('unknown');
    expect(r.profile_skipped).toBe(true);
  });

  it('non_eu without CF → verify + checklist', () => {
    const r = computeBuyerReadiness(
      {
        residency: 'non_eu',
        purpose: 'investimento',
        has_cf: false,
        has_pec_firma: true,
        financing_needed: false,
      },
      baseEx('telematica'),
    );
    expect(r.level).toBe('verify');
    expect(r.checklist.map((c) => c.key)).toContain('cf_required_non_eu');
  });

  it('telematica without PEC → verify', () => {
    const r = computeBuyerReadiness(
      {
        residency: 'it_resident',
        purpose: 'prima_casa',
        has_cf: true,
        has_pec_firma: false,
        financing_needed: null,
      },
      baseEx('telematica'),
    );
    expect(r.level).toBe('verify');
    expect(r.checklist.map((c) => c.key)).toContain('pec_firma_required_telematica');
  });

  it('financing_needed → verify with financing item', () => {
    const r = computeBuyerReadiness(
      {
        residency: 'it_resident',
        purpose: 'prima_casa',
        has_cf: true,
        has_pec_firma: true,
        financing_needed: true,
      },
      baseEx('analogica'),
    );
    expect(r.level).toBe('verify');
    expect(r.checklist.map((c) => c.key)).toContain('financing_timeline');
  });

  it('all satisfied → ok', () => {
    const r = computeBuyerReadiness(
      {
        residency: 'it_resident',
        purpose: 'investimento',
        has_cf: true,
        has_pec_firma: true,
        financing_needed: false,
      },
      baseEx('telematica'),
    );
    expect(r.level).toBe('ok');
    expect(r.checklist.some((c) => c.key === 'buyer_ready')).toBe(true);
  });
});
