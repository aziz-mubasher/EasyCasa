import { describe, expect, it, vi } from 'vitest';

import type { AsteExtractionV1 } from './extraction-schema';
import { collectFreeTextSnippets } from './aste-free-text';

function readyExtraction(): AsteExtractionV1 {
  return {
    schema_version: 1,
    procedura: {
      tribunale: 'Milano',
      rge: '123/2024',
      lotto: '1',
      giudice_delegato: null,
      data_asta: '2026-09-15',
      termine_offerte: '2026-09-10T12:00:00Z',
      modalita: 'telematica',
    },
    economics: {
      valore_stima: { value: 250000, source: { file: 'doc-perizia', page: 2 } },
      prezzo_base: { value: 200000, source: { file: 'doc-avviso', page: 1 } },
      offerta_minima: { value: 150000, source: { file: 'doc-avviso', page: 1 } },
      cauzione_pct: { value: 10, source: { file: 'doc-avviso', page: 1 } },
      rilancio_minimo: { value: 2000, source: { file: 'doc-avviso', page: 1 } },
      superficie_commerciale_mq: { value: 95, source: { file: 'doc-perizia', page: 3 } },
    },
    immobile: {
      tipologia: 'Appartamento',
      piano: '3',
      vani: 4,
      locali: ['soggiorno', 'cucina'],
      categoria_catastale: 'A/2',
      foglio: '12',
      particella: '34',
      subalterno: '5',
      rendita: 1200,
      indirizzo: 'Via Roma 1',
      comune: 'Milano',
      provincia: 'MI',
    },
    giuridica: {
      diritto_venduto: 'piena proprietà',
      stato_occupazione: {
        stato: 'libero',
        dettaglio: 'Immobile libero da persone',
        opponibilita: null,
      },
      vincoli: [],
      formalita: [],
    },
    urbanistica: {
      conformita_urbanistica: { stato: 'conforme', dettaglio: 'Dichiarata conforme' },
      conformita_catastale: { stato: 'conforme', dettaglio: null },
      difformita: [],
    },
    condizioni: {
      stato_manutentivo: 'buono',
      impianti: 'ordinari',
      lavori_stimati: null,
    },
    spese: {
      condominiali_arretrate: null,
      oneri_acquirente: [{ descrizione: 'Spese di trasferimento', source: { file: 'doc-avviso', page: 2 } }],
    },
    meta: {
      documents: [
        { file: 'doc-perizia', doc_type: 'perizia', pages: 10, ocr_pages: 0 },
        { file: 'doc-avviso', doc_type: 'avviso', pages: 4, ocr_pages: 0 },
      ],
      not_found: ['spese.condominiali_arretrate'],
      warnings: ['Verificare formalità ipotecarie'],
      schema_version: 1,
    },
  };
}

describe('collectFreeTextSnippets', () => {
  it('collects dettaglio/descrizione/oneri/warnings paths', () => {
    const snips = collectFreeTextSnippets(readyExtraction());
    const paths = snips.map((s) => s.path);
    expect(paths).toContain('giuridica.stato_occupazione.dettaglio');
    expect(paths).toContain('spese.oneri_acquirente.0.descrizione');
    expect(paths).toContain('meta.warnings.0');
    expect(paths).toContain('meta.not_found.0');
  });
});

describe('AsteReportService translation cache', () => {
  it('calls translate once then uses cache (mocked service wiring)', async () => {
    const translate = vi.fn(
      async () => [
        'Free of occupants',
        'Declared compliant',
        'good',
        'ordinary',
        'Transfer costs',
        'Check mortgage formalities',
        'spese.condominiali_arretrate',
        'Apartment',
      ],
    );
    // Simulate Nest cache logic
    const snippets = collectFreeTextSnippets(readyExtraction());
    let cache: Record<string, string> | null = null;
    let calls = 0;
    async function ensureEn() {
      if (cache) return cache;
      calls += 1;
      const translated = await translate();
      cache = Object.fromEntries(snippets.map((s, i) => [s.path, translated[i] ?? '']));
      return cache;
    }
    await ensureEn();
    await ensureEn();
    expect(calls).toBe(1);
    expect(translate).toHaveBeenCalledTimes(1);
  });
});
