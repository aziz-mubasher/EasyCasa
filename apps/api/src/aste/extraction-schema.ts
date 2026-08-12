/**
 * EC-23 / EC-23b — extraction schema.
 * v1 kept for typing historical payloads; pipeline persists schema_version 2 only.
 * No natural-person name fields by design (LGL-1 Q-A1).
 */

export type AsteSourceRef = { file: string; page: number };

export type AsteSourcedNumber = {
  value: number;
  source: AsteSourceRef;
};

export type AsteProceduraTipo = 'rge' | 'lg' | 'ei' | 'fall' | 'altro';

export type AsteCauzioneBase = 'prezzo_base' | 'prezzo_offerto';

export type AsteImmobileUnit = {
  tipologia: string | null;
  piano: string | null;
  vani: number | null;
  locali: string[];
  categoria_catastale: string | null;
  foglio: string | null;
  particella: string | null;
  subalterno: string | null;
  rendita: number | null;
  indirizzo: string | null;
  comune: string | null;
  provincia: string | null;
  /** e.g. "senza attribuzione di valore ai fini del prezzo base" */
  note_valore: string | null;
};

export type AsteCauzione = {
  pct: number | null;
  base: AsteCauzioneBase | null;
  importo: number | null;
  source: AsteSourceRef | null;
  /** True when importo was computed from pct × prezzo_base (EC-30). */
  derived?: boolean;
};

export type AsteGiuridica = {
  diritto_venduto: string | null;
  stato_occupazione: {
    stato: string | null;
    dettaglio: string | null;
    opponibilita: string | null;
    source?: AsteSourceRef | null;
  };
  vincoli: Array<{ tipo: string; descrizione: string; source: AsteSourceRef }>;
  formalita: Array<{
    tipo: string;
    cancellabile_con_decreto: boolean | null;
    descrizione: string;
    source: AsteSourceRef;
  }>;
};

export type AsteUrbanistica = {
  conformita_urbanistica: { stato: string | null; dettaglio: string | null };
  conformita_catastale: { stato: string | null; dettaglio: string | null };
  difformita: Array<{
    descrizione: string;
    sanabile: boolean | null;
    costo_stimato: number | null;
    source: AsteSourceRef;
  }>;
};

export type AsteCondizioni = {
  stato_manutentivo: string | null;
  impianti: string | null;
  lavori_stimati: { min: number; max: number } | null;
};

export type AsteSpese = {
  condominiali_arretrate: AsteSourcedNumber | null;
  oneri_acquirente: Array<{ descrizione: string; source: AsteSourceRef }>;
};

/** @deprecated EC-23 — historical; pipeline writes v2 only. */
export type AsteExtractionV1 = {
  schema_version: 1;
  procedura: {
    tribunale: string | null;
    rge: string | null;
    lotto: string | null;
    giudice_delegato: string | null;
    data_asta: string | null;
    termine_offerte: string | null;
    modalita: 'telematica' | 'mista' | 'analogica' | null;
  };
  economics: {
    valore_stima: AsteSourcedNumber | null;
    prezzo_base: AsteSourcedNumber | null;
    offerta_minima: AsteSourcedNumber | null;
    cauzione_pct: AsteSourcedNumber | null;
    rilancio_minimo: AsteSourcedNumber | null;
    superficie_commerciale_mq: AsteSourcedNumber | null;
  };
  immobile: Omit<AsteImmobileUnit, 'note_valore'>;
  giuridica: AsteGiuridica;
  urbanistica: AsteUrbanistica;
  condizioni: AsteCondizioni;
  spese: AsteSpese;
  meta: {
    documents: Array<{
      file: string;
      doc_type: string;
      pages: number;
      ocr_pages: number;
    }>;
    not_found: string[];
    warnings: string[];
    schema_version: 1;
  };
};

export type AsteExtractionV2 = {
  schema_version: 2;
  procedura: {
    tipo: AsteProceduraTipo | null;
    numero: string | null;
    /** Compat / display when tipo=rge — mirrors numero */
    rge: string | null;
    tribunale: string | null;
    lotto: string | null;
    giudice_delegato: string | null;
    data_asta: string | null;
    termine_offerte: string | null;
    modalita: 'telematica' | 'mista' | 'analogica' | null;
  };
  economics: {
    valore_stima: AsteSourcedNumber | null;
    prezzo_base: AsteSourcedNumber | null;
    offerta_minima: AsteSourcedNumber | null;
    cauzione: AsteCauzione | null;
    rilancio_minimo: AsteSourcedNumber | null;
    superficie_commerciale_mq: AsteSourcedNumber | null;
  };
  immobili: AsteImmobileUnit[];
  giuridica: AsteGiuridica;
  urbanistica: AsteUrbanistica;
  condizioni: AsteCondizioni;
  spese: AsteSpese;
  meta: {
    documents: Array<{
      file: string;
      doc_type: string;
      pages: number;
      ocr_pages: number;
    }>;
    not_found: string[];
    warnings: string[];
    schema_version: 2;
    lotto: { label: string | null; source: string | null } | null;
    lotti_trovati: string[];
    /** Optional dual candidates for Nest precedence guard (fixture / AI). */
    prezzo_base_candidates?: AsteSourcedNumber[];
  };
};

/** Current pipeline extraction type. */
export type AsteExtraction = AsteExtractionV2;

export type SemaforoLevel = 'ok' | 'verify' | 'critical' | 'unknown';

export type AsteSemaforo = {
  vincoli_gravami: SemaforoLevel;
  occupazione: SemaforoLevel;
  conformita_urbanistica: SemaforoLevel;
  conformita_catastale: SemaforoLevel;
  condizione_immobile: SemaforoLevel;
  spese_condominiali: SemaforoLevel;
  rischio_asta: SemaforoLevel;
  buyer_readiness: SemaforoLevel;
};

export function emptyImmobileUnit(): AsteImmobileUnit {
  return {
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
    note_valore: null,
  };
}

export function primaryImmobile(ex: AsteExtractionV2): AsteImmobileUnit {
  return ex.immobili[0] ?? emptyImmobileUnit();
}

export function cauzionePctValue(ex: AsteExtractionV2): number | null {
  return ex.economics.cauzione?.pct ?? null;
}
