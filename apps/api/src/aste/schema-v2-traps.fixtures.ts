/**
 * EC-23b §5.6 — synthetic extraction fixtures encoding the seven real-document traps.
 * Used by unit tests; not golden-set PDFs (those stay AZM-only / Drive).
 */
import type { AsteExtractionV2 } from './extraction-schema';
import { emptyImmobileUnit } from './extraction-schema';

function baseMeta(extra?: Partial<AsteExtractionV2['meta']>): AsteExtractionV2['meta'] {
  return {
    documents: [
      { file: 'avviso', doc_type: 'avviso', pages: 4, ocr_pages: 0 },
      { file: 'ordinanza', doc_type: 'ordinanza', pages: 2, ocr_pages: 0 },
      { file: 'perizia', doc_type: 'perizia', pages: 40, ocr_pages: 2 },
    ],
    not_found: [],
    warnings: [],
    schema_version: 2,
    lotto: null,
    lotti_trovati: [],
    ...extra,
  };
}

function emptyEx(partial?: Partial<AsteExtractionV2>): AsteExtractionV2 {
  return {
    schema_version: 2,
    procedura: {
      tipo: 'rge',
      numero: '1/2024',
      rge: '1/2024',
      tribunale: 'Milano',
      lotto: null,
      giudice_delegato: null,
      data_asta: null,
      termine_offerte: null,
      modalita: 'telematica',
    },
    economics: {
      valore_stima: null,
      prezzo_base: null,
      offerta_minima: null,
      cauzione: null,
      rilancio_minimo: null,
      superficie_commerciale_mq: null,
    },
    immobili: [emptyImmobileUnit()],
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
    meta: baseMeta(),
    ...partial,
  };
}

/** Trap 1 — multi-lot bleed absent when label set (lots H/I/M, scoped to H). */
export function trapMultiLotScopedH(): AsteExtractionV2 {
  return emptyEx({
    procedura: {
      tipo: 'rge',
      numero: '10/2023',
      rge: '10/2023',
      tribunale: 'Roma',
      lotto: 'H',
      giudice_delegato: null,
      data_asta: '2026-10-01',
      termine_offerte: null,
      modalita: 'telematica',
    },
    economics: {
      valore_stima: { value: 120000, source: { file: 'perizia', page: 12 } },
      prezzo_base: { value: 90000, source: { file: 'avviso', page: 1 } },
      offerta_minima: { value: 67500, source: { file: 'avviso', page: 1 } },
      cauzione: {
        pct: 10,
        base: 'prezzo_base',
        importo: 9000,
        source: { file: 'avviso', page: 1 },
      },
      rilancio_minimo: { value: 1000, source: { file: 'avviso', page: 1 } },
      superficie_commerciale_mq: { value: 70, source: { file: 'perizia', page: 12 } },
    },
    immobili: [
      {
        ...emptyImmobileUnit(),
        tipologia: 'Appartamento',
        comune: 'Roma',
        provincia: 'RM',
        foglio: '1',
        particella: '2',
        subalterno: '3',
      },
    ],
    meta: baseMeta({
      lotto: { label: 'H', source: 'user' },
      lotti_trovati: ['H', 'I', 'M'],
    }),
  });
}

/** Trap 2 — selection required (multi-lot, no user label). */
export function trapSelectionRequired(): AsteExtractionV2 {
  const ex = trapMultiLotScopedH();
  ex.meta.lotto = null;
  ex.procedura.lotto = null;
  return ex;
}

/** Trap 3 — prezzo_base precedence: ordinanza high vs avviso low. */
export function trapPrezzoPrecedence(): AsteExtractionV2 {
  const ex = emptyEx({
    economics: {
      valore_stima: null,
      prezzo_base: { value: 85000, source: { file: 'ordinanza', page: 1 } },
      offerta_minima: null,
      cauzione: null,
      rilancio_minimo: null,
      superficie_commerciale_mq: null,
    },
    meta: baseMeta({
      prezzo_base_candidates: [
        { value: 85000, source: { file: 'ordinanza', page: 1 } },
        { value: 36000, source: { file: 'avviso', page: 1 } },
      ],
    }),
  });
  return ex;
}

/**
 * Trap 4 — lotto H non-conform / note_valore trap (unit without value attribution).
 * Representation only — semaforo consumers read urbanistica separately.
 */
export function trapLottoHNoteValore(): AsteExtractionV2 {
  const ex = trapMultiLotScopedH();
  ex.immobili[0] = {
    ...ex.immobili[0]!,
    note_valore: 'senza attribuzione di valore ai fini del prezzo base',
  };
  ex.urbanistica.conformita_urbanistica = {
    stato: 'difforme',
    dettaglio: 'Difformità rilevata sul lotto H',
  };
  return ex;
}

/** Trap 5 — cauzione 20% del prezzo offerto. */
export function trapCauzionePrezzoOfferto(): AsteExtractionV2 {
  return emptyEx({
    economics: {
      valore_stima: null,
      prezzo_base: { value: 100000, source: { file: 'avviso', page: 1 } },
      offerta_minima: { value: 75000, source: { file: 'avviso', page: 1 } },
      cauzione: {
        pct: 20,
        base: 'prezzo_offerto',
        importo: null,
        source: { file: 'avviso', page: 2 },
      },
      rilancio_minimo: null,
      superficie_commerciale_mq: null,
    },
  });
}

/** Trap 6 — L.G. procedure tipo (not R.G.E.). */
export function trapProceduraLg(): AsteExtractionV2 {
  return emptyEx({
    procedura: {
      tipo: 'lg',
      numero: '26/2025',
      rge: null,
      tribunale: 'Nocera Inferiore',
      lotto: 'unico',
      giudice_delegato: null,
      data_asta: null,
      termine_offerte: null,
      modalita: 'telematica',
    },
    meta: baseMeta({
      lotto: { label: 'unico', source: 'user' },
      lotti_trovati: ['unico'],
    }),
  });
}

/** Trap 7 — apartment + box as two immobili entries. */
export function trapApartmentPlusBox(): AsteExtractionV2 {
  return emptyEx({
    immobili: [
      {
        ...emptyImmobileUnit(),
        tipologia: 'Appartamento',
        categoria_catastale: 'A/2',
        foglio: '10',
        particella: '20',
        subalterno: '1',
        comune: 'Milano',
        provincia: 'MI',
      },
      {
        ...emptyImmobileUnit(),
        tipologia: 'Box',
        categoria_catastale: 'C/6',
        foglio: '10',
        particella: '20',
        subalterno: '15',
        comune: 'Milano',
        provincia: 'MI',
        note_valore: 'pertinenza inclusa nel lotto',
      },
    ],
  });
}
