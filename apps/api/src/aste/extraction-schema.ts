/**
 * EC-23 — fixed extraction schema v1 (persisted on aste_analyses.extraction).
 * No natural-person name fields by design (LGL-1 Q-A1).
 */

export type AsteSourceRef = { file: string; page: number };

export type AsteSourcedNumber = {
  value: number;
  source: AsteSourceRef;
};

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
  immobile: {
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
  };
  giuridica: {
    diritto_venduto: string | null;
    stato_occupazione: {
      stato: string | null;
      dettaglio: string | null;
      opponibilita: string | null;
    };
    vincoli: Array<{ tipo: string; descrizione: string; source: AsteSourceRef }>;
    formalita: Array<{
      tipo: string;
      cancellabile_con_decreto: boolean | null;
      descrizione: string;
      source: AsteSourceRef;
    }>;
  };
  urbanistica: {
    conformita_urbanistica: { stato: string | null; dettaglio: string | null };
    conformita_catastale: { stato: string | null; dettaglio: string | null };
    difformita: Array<{
      descrizione: string;
      sanabile: boolean | null;
      costo_stimato: number | null;
      source: AsteSourceRef;
    }>;
  };
  condizioni: {
    stato_manutentivo: string | null;
    impianti: string | null;
    lavori_stimati: { min: number; max: number } | null;
  };
  spese: {
    condominiali_arretrate: AsteSourcedNumber | null;
    oneri_acquirente: Array<{ descrizione: string; source: AsteSourceRef }>;
  };
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

export type SemaforoLevel = 'ok' | 'verify' | 'critical' | 'unknown';

export type AsteSemaforo = {
  vincoli_gravami: SemaforoLevel;
  occupazione: SemaforoLevel;
  conformita_urbanistica: SemaforoLevel;
  conformita_catastale: SemaforoLevel;
  condizione_immobile: SemaforoLevel;
  spese_condominiali: SemaforoLevel;
  rischio_asta: SemaforoLevel;
  /** Placeholder until EC-24 residency input. */
  buyer_readiness: SemaforoLevel;
};
