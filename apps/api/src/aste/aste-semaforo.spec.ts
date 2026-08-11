import { describe, expect, it } from 'vitest';

import { computeSemaforo } from './aste-semaforo';
import type { AsteExtractionV2 } from './extraction-schema';

function base(over: Partial<AsteExtractionV2> = {}): AsteExtractionV2 {
  const empty: AsteExtractionV2 = {
    schema_version: 2,
    procedura: {
      tipo: 'rge',
      numero: '1/2024',
      tribunale: null,
      rge: null,
      lotto: null,
      giudice_delegato: null,
      data_asta: null,
      termine_offerte: null,
      modalita: null,
    },
    economics: {
      valore_stima: { value: 100000, source: { file: 'd1', page: 1 } },
      prezzo_base: { value: 80000, source: { file: 'd1', page: 1 } },
      offerta_minima: { value: 60000, source: { file: 'd1', page: 1 } },
      cauzione: { pct: 10, base: 'prezzo_base', importo: null, source: { file: 'd1', page: 1 } },
      rilancio_minimo: { value: 1000, source: { file: 'd1', page: 1 } },
      superficie_commerciale_mq: { value: 90, source: { file: 'd1', page: 1 } },
    },
    immobili: [{

      tipologia: 'appartamento',
      piano: '2',
      vani: 5,
      locali: [],
      categoria_catastale: 'A/2',
      foglio: '1',
      particella: '2',
      subalterno: '3',
      rendita: 500,
      indirizzo: 'Via Roma 1',
      comune: 'Milano',
      provincia: 'MI',
      note_valore: null,
    }],
    giuridica: {
      diritto_venduto: 'piena proprietà',
      stato_occupazione: { stato: 'libero', dettaglio: null, opponibilita: null },
      vincoli: [],
      formalita: [],
    },
    urbanistica: {
      conformita_urbanistica: { stato: 'conforme', dettaglio: null },
      conformita_catastale: { stato: 'conforme', dettaglio: null },
      difformita: [],
    },
    condizioni: { stato_manutentivo: 'buono', impianti: 'ordinari', lavori_stimati: null },
    spese: { condominiali_arretrate: null, oneri_acquirente: [] },
    meta: {
      documents: [
        { file: 'd1', doc_type: 'perizia', pages: 10, ocr_pages: 0 },
        { file: 'd2', doc_type: 'avviso', pages: 2, ocr_pages: 0 },
      ],
      not_found: ['spese.condominiali_arretrate'],
      warnings: [],
      schema_version: 2,
      lotto: null,
      lotti_trovati: [],
    },
  };
  return {
    ...empty,
    ...over,
    economics: { ...empty.economics, ...(over.economics ?? {}) },
    giuridica: { ...empty.giuridica, ...(over.giuridica ?? {}) },
    urbanistica: { ...empty.urbanistica, ...(over.urbanistica ?? {}) },
    condizioni: { ...empty.condizioni, ...(over.condizioni ?? {}) },
    spese: { ...empty.spese, ...(over.spese ?? {}) },
    meta: { ...empty.meta, ...(over.meta ?? {}) },
  };
}

describe('computeSemaforo', () => {
  it('marks libero occupancy ok and missing condo spese verify', () => {
    const s = computeSemaforo(base());
    expect(s.occupazione).toBe('ok');
    expect(s.spese_condominiali).toBe('verify');
    expect(s.rischio_asta).toBe('ok');
    expect(s.buyer_readiness).toBe('unknown');
    expect(s.condizione_immobile).toBe('ok');
  });

  it('marks terzo con titolo opponibile as critical occupancy', () => {
    const s = computeSemaforo(
      base({
        giuridica: {
          diritto_venduto: null,
          stato_occupazione: {
            stato: 'occupato da terzo',
            dettaglio: 'locatario',
            opponibilita: 'titolo opponibile',
          },
          vincoli: [],
          formalita: [],
        },
      }),
    );
    expect(s.occupazione).toBe('critical');
  });

  it('marks debitore occupancy as verify', () => {
    const s = computeSemaforo(
      base({
        giuridica: {
          diritto_venduto: null,
          stato_occupazione: {
            stato: 'occupato da debitore',
            dettaglio: null,
            opponibilita: null,
          },
          vincoli: [],
          formalita: [],
        },
      }),
    );
    expect(s.occupazione).toBe('verify');
  });

  it('marks non-cancellable formalita critical for vincoli', () => {
    const s = computeSemaforo(
      base({
        giuridica: {
          diritto_venduto: null,
          stato_occupazione: { stato: 'libero', dettaglio: null, opponibilita: null },
          vincoli: [],
          formalita: [
            {
              tipo: 'ipoteca',
              cancellabile_con_decreto: false,
              descrizione: 'non cancellabile',
              source: { file: 'd1', page: 3 },
            },
          ],
        },
      }),
    );
    expect(s.vincoli_gravami).toBe('critical');
  });

  it('marks paesaggistico vincolo as verify', () => {
    const s = computeSemaforo(
      base({
        giuridica: {
          diritto_venduto: null,
          stato_occupazione: { stato: 'libero', dettaglio: null, opponibilita: null },
          vincoli: [
            {
              tipo: 'paesaggistico',
              descrizione: 'vincolo paesaggistico',
              source: { file: 'd1', page: 4 },
            },
          ],
          formalita: [],
        },
      }),
    );
    expect(s.vincoli_gravami).toBe('verify');
  });

  it('marks condo arrears >= 5% of prezzo_base as critical', () => {
    const s = computeSemaforo(
      base({
        spese: {
          condominiali_arretrate: { value: 5000, source: { file: 'd1', page: 5 } },
          oneri_acquirente: [],
        },
        meta: {
          documents: [
            { file: 'd1', doc_type: 'perizia', pages: 10, ocr_pages: 0 },
            { file: 'd2', doc_type: 'avviso', pages: 2, ocr_pages: 0 },
          ],
          not_found: [],
          warnings: [],
          schema_version: 2,
        },
      }),
    );
    expect(s.spese_condominiali).toBe('critical');
  });

  it('marks missing economics not_found as rischio verify', () => {
    const s = computeSemaforo(
      base({
        economics: {
          valore_stima: null,
          prezzo_base: null,
          offerta_minima: null,
          cauzione: null,
          rilancio_minimo: null,
          superficie_commerciale_mq: null,
        },
        meta: {
          documents: [
            { file: 'd1', doc_type: 'perizia', pages: 10, ocr_pages: 0 },
            { file: 'd2', doc_type: 'avviso', pages: 2, ocr_pages: 0 },
          ],
          not_found: ['economics.prezzo_base', 'economics.valore_stima'],
          warnings: [],
          schema_version: 2,
        },
      }),
    );
    expect(s.rischio_asta).toBe('verify');
  });

  it('marks missing perizia or avviso as rischio critical', () => {
    const s = computeSemaforo(
      base({
        meta: {
          documents: [{ file: 'd1', doc_type: 'perizia', pages: 10, ocr_pages: 0 }],
          not_found: [],
          warnings: [],
          schema_version: 2,
        },
      }),
    );
    expect(s.rischio_asta).toBe('critical');
  });

  it('marks abuso non sanabile as critical urbanistica', () => {
    const s = computeSemaforo(
      base({
        urbanistica: {
          conformita_urbanistica: { stato: 'abuso non sanabile', dettaglio: null },
          conformita_catastale: { stato: 'conforme', dettaglio: null },
          difformita: [],
        },
      }),
    );
    expect(s.conformita_urbanistica).toBe('critical');
  });

  it('marks lavori stimati as condizione verify', () => {
    const s = computeSemaforo(
      base({
        condizioni: {
          stato_manutentivo: 'ordinario',
          impianti: null,
          lavori_stimati: { min: 10000, max: 20000 },
        },
      }),
    );
    expect(s.condizione_immobile).toBe('verify');
  });
});
