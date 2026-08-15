import type { AsteOmiCheck } from './aste-omi-check';
import { aggregateSemaforoLevel } from './aste-semaforo';
import type { AsteExtractionV2, AsteSemaforo } from './extraction-schema';

/** Teaser OMI — available + omi_range only; never expose valore_stima fields. */
export function teaserOmiCheck(omi: AsteOmiCheck | null): AsteOmiCheck | null {
  if (!omi) return null;
  return {
    available: omi.available,
    method: omi.method,
    confidence: omi.confidence,
    normalization: omi.normalization,
    tip_mapping: omi.tip_mapping,
    omi_eur_mq: omi.omi_eur_mq,
    omi_range: omi.omi_range,
    omi_range_unit: omi.omi_range_unit,
    superficie_mq: omi.superficie_mq,
    prezzo_base: omi.prezzo_base,
    valore_stima: null,
    prezzo_base_vs_omi_pct: omi.prezzo_base_vs_omi_pct,
    valore_stima_vs_omi_pct: null,
    sconto_reale_pct: omi.sconto_reale_pct,
    period: omi.period,
    link_zona: omi.link_zona,
    attribution: omi.attribution,
    warnings: omi.warnings,
  };
}

/** Procedure header fields only — tribunale, RGE, lotto, auction date. */
export function teaserExtraction(extraction: AsteExtractionV2) {
  return {
    schema_version: extraction.schema_version,
    procedura: {
      tipo: extraction.procedura.tipo,
      numero: extraction.procedura.numero,
      rge: extraction.procedura.rge,
      tribunale: extraction.procedura.tribunale,
      lotto: extraction.procedura.lotto,
      giudice_delegato: null,
      data_asta: extraction.procedura.data_asta,
      termine_offerte: null,
      modalita: null,
    },
    meta: {
      schema_version: extraction.meta.schema_version,
      lotto: extraction.meta.lotto,
    },
  };
}

export function buildTeaserReportPayload(full: {
  id: string;
  status: string;
  language: string;
  register: string;
  tribunale: string | null;
  rge: string | null;
  lotto: string | null;
  lottoLabel: string | null;
  dataAsta: string | null;
  extraction: AsteExtractionV2;
  semaforo: AsteSemaforo;
  omiCheck: AsteOmiCheck | null;
  entitlement: { monetisationEnabled: boolean; unlocked: boolean; creditBalance: number };
}) {
  return {
    id: full.id,
    status: full.status,
    language: full.language,
    register: full.register,
    tribunale: full.tribunale,
    rge: full.rge,
    lotto: full.lotto,
    lottoLabel: full.lottoLabel,
    dataAsta: full.dataAsta,
    termineOfferte: null,
    addressRaw: null,
    comune: null,
    provincia: null,
    viewMode: 'teaser' as const,
    entitlement: full.entitlement,
    semaforoAggregate: aggregateSemaforoLevel(full.semaforo),
    extraction: teaserExtraction(full.extraction),
    omiCheck: teaserOmiCheck(full.omiCheck),
    buyerProfile: null,
    buyerReadiness: { level: 'unknown' as const, checklist: [] },
    buyerProfileSkipped: true,
    translations: {},
    reportContentLang: full.language === 'en' ? ('en' as const) : ('it' as const),
    esContentFallback: full.language === 'es',
    criticita: [],
    documents: [],
    filenameById: {},
    glossary: [],
    translateCalls: 0,
  };
}
