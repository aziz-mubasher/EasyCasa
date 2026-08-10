/**
 * EC-24 — pure OMI comparison from extraction + resolved band.
 * Missing inputs → nulls + warnings; never guess.
 */

export type OmiCheckMethod = 'zone' | 'comune';

export type OmiBandInput = {
  minEurSqm: number;
  maxEurSqm: number;
  period: string;
  linkZona: string | null;
  attribution: string;
};

export type AsteOmiCheck = {
  available: boolean;
  method: OmiCheckMethod | null;
  confidence: 'high' | 'medium' | 'low' | null;
  normalization: {
    comune: string | null;
    provincia: string | null;
    rules: string;
  };
  tip_mapping: {
    cod_tip: number;
    property_type: string;
    used_generic: boolean;
    matched_on: string;
    source: string | null;
  };
  omi_eur_mq: { min: number; max: number; mid: number } | null;
  omi_range: { min: number; max: number; mid: number } | null;
  /** total_eur when superficie known; eur_per_mq otherwise. */
  omi_range_unit: 'total_eur' | 'eur_per_mq' | null;
  superficie_mq: number | null;
  prezzo_base: number | null;
  valore_stima: number | null;
  prezzo_base_vs_omi_pct: number | null;
  valore_stima_vs_omi_pct: number | null;
  /** (omi_mid_value − prezzo_base) / omi_mid_value when superficie known. */
  sconto_reale_pct: number | null;
  period: string | null;
  link_zona: string | null;
  attribution: string;
  warnings: string[];
};

export const OMI_CHECK_ATTRIBUTION = 'Fonte: OMI — Agenzia delle Entrate';

export const OMI_COMUNE_NORMALIZATION_RULES =
  'trim → Unicode NFD accent-fold → UPPERCASE → apostrophe normalize → collapse whitespace; provincia → 2-letter sigla via normalizeProvinceSlug';

function pctVsMid(value: number, mid: number): number | null {
  if (!(mid > 0) || !Number.isFinite(value)) return null;
  return Math.round(((value - mid) / mid) * 1000) / 10;
}

/** Pure builder — unit-tested. */
export function buildOmiCheck(input: {
  method: OmiCheckMethod | null;
  confidence: AsteOmiCheck['confidence'];
  comuneNormalized: string | null;
  provinciaNormalized: string | null;
  tip: {
    codTip: number;
    propertyType: string;
    usedGeneric: boolean;
    matchedOn: string;
    source: string | null;
  };
  band: OmiBandInput | null;
  superficieMq: number | null;
  prezzoBase: number | null;
  valoreStima: number | null;
  extraWarnings?: string[];
}): AsteOmiCheck {
  const warnings = [...(input.extraWarnings ?? [])];
  if (input.tip.usedGeneric) {
    warnings.push('tipologia_categoria_unmapped_used_residential_generic');
  }
  if (!input.comuneNormalized) {
    warnings.push('comune_missing');
  }
  if (!input.band) {
    if (input.comuneNormalized) warnings.push('comune_unmatched_or_no_omi_band');
    return {
      available: false,
      method: input.method,
      confidence: null,
      normalization: {
        comune: input.comuneNormalized,
        provincia: input.provinciaNormalized,
        rules: OMI_COMUNE_NORMALIZATION_RULES,
      },
      tip_mapping: {
        cod_tip: input.tip.codTip,
        property_type: input.tip.propertyType,
        used_generic: input.tip.usedGeneric,
        matched_on: input.tip.matchedOn,
        source: input.tip.source,
      },
      omi_eur_mq: null,
      omi_range: null,
      omi_range_unit: null,
      superficie_mq: input.superficieMq,
      prezzo_base: input.prezzoBase,
      valore_stima: input.valoreStima,
      prezzo_base_vs_omi_pct: null,
      valore_stima_vs_omi_pct: null,
      sconto_reale_pct: null,
      period: null,
      link_zona: null,
      attribution: OMI_CHECK_ATTRIBUTION,
      warnings,
    };
  }

  const midMq = (input.band.minEurSqm + input.band.maxEurSqm) / 2;
  const omiEurMq = {
    min: input.band.minEurSqm,
    max: input.band.maxEurSqm,
    mid: midMq,
  };

  const superficie =
    input.superficieMq != null && input.superficieMq > 0 ? input.superficieMq : null;
  if (superficie == null) {
    warnings.push('superficie_missing_eur_per_mq_only');
  }

  const omiRange = superficie
    ? {
        min: omiEurMq.min * superficie,
        max: omiEurMq.max * superficie,
        mid: omiEurMq.mid * superficie,
      }
    : { ...omiEurMq };
  const unit: 'total_eur' | 'eur_per_mq' = superficie ? 'total_eur' : 'eur_per_mq';
  const midValue = omiRange.mid;

  let prezzo_base_vs_omi_pct: number | null = null;
  let valore_stima_vs_omi_pct: number | null = null;
  let sconto_reale_pct: number | null = null;

  if (superficie && input.prezzoBase != null) {
    prezzo_base_vs_omi_pct = pctVsMid(input.prezzoBase, midValue);
    sconto_reale_pct =
      midValue > 0
        ? Math.round(((midValue - input.prezzoBase) / midValue) * 1000) / 10
        : null;
  } else if (!superficie && input.prezzoBase != null) {
    warnings.push('prezzo_base_pct_requires_superficie');
  }

  if (superficie && input.valoreStima != null) {
    valore_stima_vs_omi_pct = pctVsMid(input.valoreStima, midValue);
  } else if (!superficie && input.valoreStima != null) {
    warnings.push('valore_stima_pct_requires_superficie');
  }

  return {
    available: true,
    method: input.method,
    confidence: input.confidence,
    normalization: {
      comune: input.comuneNormalized,
      provincia: input.provinciaNormalized,
      rules: OMI_COMUNE_NORMALIZATION_RULES,
    },
    tip_mapping: {
      cod_tip: input.tip.codTip,
      property_type: input.tip.propertyType,
      used_generic: input.tip.usedGeneric,
      matched_on: input.tip.matchedOn,
      source: input.tip.source,
    },
    omi_eur_mq: omiEurMq,
    omi_range: omiRange,
    omi_range_unit: unit,
    superficie_mq: superficie,
    prezzo_base: input.prezzoBase,
    valore_stima: input.valoreStima,
    prezzo_base_vs_omi_pct,
    valore_stima_vs_omi_pct,
    sconto_reale_pct,
    period: input.band.period,
    link_zona: input.band.linkZona,
    attribution: input.band.attribution || OMI_CHECK_ATTRIBUTION,
    warnings,
  };
}
