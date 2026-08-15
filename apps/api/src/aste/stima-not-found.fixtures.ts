/**
 * EC-24-VERIFY — extraction fixtures when economics.valore_stima is absent / not_found.
 * Shapes mirror post-EC-33/34/35 live rows (Ex2 no-perizia, suspect-cleared, derived cauzione).
 */
import type { AsteExtractionV2 } from './extraction-schema';

function ex2Base(lotto: '4' | '7', avvisoId: string): AsteExtractionV2 {
  const prezzoBase = lotto === '7' ? 64_906 : 36_039;
  const offertaMinima = lotto === '7' ? 48_680 : 27_029.25;
  const cauzioneImporto = Math.round(prezzoBase * 0.1);

  return {
    schema_version: 2,
    procedura: {
      tipo: 'rge',
      numero: '10/2023',
      tribunale: 'Nocera Inferiore',
      rge: '10/2023',
      lotto,
      giudice_delegato: null,
      data_asta: '2026-11-20',
      termine_offerte: '2026-11-15T12:00:00.000Z',
      modalita: 'telematica',
    },
    economics: {
      valore_stima: null,
      prezzo_base: { value: prezzoBase, source: { file: avvisoId, page: 1 } },
      offerta_minima: { value: offertaMinima, source: { file: avvisoId, page: 1 } },
      cauzione: {
        pct: 10,
        base: 'prezzo_base',
        importo: cauzioneImporto,
        derived: true,
        source: null,
      },
      rilancio_minimo: { value: 1_000, source: { file: avvisoId, page: 1 } },
      superficie_commerciale_mq: { value: 78, source: { file: avvisoId, page: 1 } },
    },
    immobili: [
      {
        tipologia: 'Appartamento',
        piano: '2',
        vani: 3,
        locali: ['soggiorno', 'cucina'],
        categoria_catastale: 'A/2',
        foglio: '15',
        particella: '220',
        subalterno: lotto === '7' ? '12' : '8',
        rendita: 650,
        indirizzo: 'Via Example 10',
        comune: 'Nocera Inferiore',
        provincia: 'SA',
        note_valore: null,
      },
    ],
    giuridica: {
      diritto_venduto: 'piena proprietà',
      stato_occupazione: { stato: 'libero', dettaglio: null, opponibilita: null },
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
    meta: {
      documents: [{ file: avvisoId, doc_type: 'avviso', pages: 6, ocr_pages: 0 }],
      not_found: ['economics.valore_stima'],
      warnings: ['auction_other_lot_cleared', 'auction_lot_section_parse'],
      schema_version: 2,
      lotto: { label: lotto, source: 'user' },
      lotti_trovati: ['4', '7'],
    },
  };
}

/** Ex2-class dossier: avviso-only, valore_stima not_found, derived cauzione. */
export function fixtureEx2NoPeriziaLotto7(avvisoId: string): AsteExtractionV2 {
  return ex2Base('7', avvisoId);
}

export function fixtureEx2NoPeriziaLotto4(avvisoId: string): AsteExtractionV2 {
  return ex2Base('4', avvisoId);
}

/** Suspect guard cleared stima — null value + warning flag (EC-33). */
export function fixtureStimaSuspectCleared(avvisoId: string): AsteExtractionV2 {
  const ex = ex2Base('7', avvisoId);
  ex.meta.warnings = [...ex.meta.warnings, 'valore_stima_suspect'];
  ex.meta.not_found = [...ex.meta.not_found, 'economics.valore_stima'];
  return ex;
}

/** Explicit not_found entry without prezzo_base superficie (eur_per_mq OMI path). */
export function fixtureStimaNotFoundNoSuperficie(avvisoId: string): AsteExtractionV2 {
  const ex = ex2Base('7', avvisoId);
  ex.economics.superficie_commerciale_mq = null;
  ex.meta.not_found = [...ex.meta.not_found, 'economics.superficie_commerciale_mq'];
  return ex;
}

/** Ex7-class: no explicit total stima; prezzo_base present; cauzione derived only. */
export function fixtureEx7HonestNoStima(avvisoId: string): AsteExtractionV2 {
  const ex = ex2Base('7', avvisoId);
  ex.procedura.tribunale = 'Roma';
  ex.procedura.lotto = 'H';
  ex.meta.lotto = { label: 'H', source: 'user' };
  ex.meta.lotti_trovati = ['H', 'I', 'M'];
  ex.immobili[0]!.note_valore = 'senza attribuzione di valore ai fini del prezzo base';
  ex.meta.warnings = ['micro_chunk_skip_when_no_perizia'];
  return ex;
}
