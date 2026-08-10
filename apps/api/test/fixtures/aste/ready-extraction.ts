/** Fixture extraction for EC-24 report tests (no live OpenAI). */
import type { AsteExtractionV1 } from '../../../src/aste/extraction-schema';

export function fixtureReadyExtraction(docIds: {
  perizia: string;
  avviso: string;
}): AsteExtractionV1 {
  return {
    schema_version: 1,
    procedura: {
      tribunale: 'Milano',
      rge: '123/2024',
      lotto: '1',
      giudice_delegato: null,
      data_asta: '2026-09-15',
      termine_offerte: '2026-09-10T12:00:00.000Z',
      modalita: 'telematica',
    },
    economics: {
      valore_stima: { value: 250000, source: { file: docIds.perizia, page: 2 } },
      prezzo_base: { value: 200000, source: { file: docIds.avviso, page: 1 } },
      offerta_minima: { value: 150000, source: { file: docIds.avviso, page: 1 } },
      cauzione_pct: { value: 10, source: { file: docIds.avviso, page: 1 } },
      rilancio_minimo: { value: 2000, source: { file: docIds.avviso, page: 1 } },
      superficie_commerciale_mq: { value: 95, source: { file: docIds.perizia, page: 3 } },
    },
    immobile: {
      tipologia: 'Appartamento',
      piano: '3',
      vani: 4,
      locali: ['soggiorno'],
      categoria_catastale: 'A/2',
      foglio: '10',
      particella: '20',
      subalterno: '1',
      rendita: 900,
      indirizzo: 'Via Dante 1',
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
      oneri_acquirente: [
        { descrizione: 'Spese di trasferimento a carico', source: { file: docIds.avviso, page: 2 } },
      ],
    },
    meta: {
      documents: [
        { file: docIds.perizia, doc_type: 'perizia', pages: 8, ocr_pages: 0 },
        { file: docIds.avviso, doc_type: 'avviso', pages: 3, ocr_pages: 0 },
      ],
      not_found: ['spese.condominiali_arretrate'],
      warnings: ['Verificare formalità'],
      schema_version: 1,
    },
  };
}
