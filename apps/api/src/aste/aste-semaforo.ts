import type { AsteExtractionV1, AsteSemaforo, SemaforoLevel } from './extraction-schema';

/**
 * EC-23 — deterministic semaforo from extraction JSON (not LLM-judged).
 * Rule table is data-driven so counsel/product can tune without rewriting control flow.
 */

const VERIFY_VINCULO_TYPES = [
  'paesaggistico',
  'servitu',
  'servitù',
  'uso civico',
  'uso_civico',
] as const;

function hasVerifyVincolo(ex: AsteExtractionV1): boolean {
  return ex.giuridica.vincoli.some((v) => {
    const hay = `${v.tipo} ${v.descrizione}`.toLowerCase();
    return VERIFY_VINCULO_TYPES.some((t) => hay.includes(t));
  });
}

function hasCriticalFormalita(ex: AsteExtractionV1): boolean {
  return ex.giuridica.formalita.some((f) => f.cancellabile_con_decreto === false);
}

function vincoliGravami(ex: AsteExtractionV1): SemaforoLevel {
  if (hasCriticalFormalita(ex)) return 'critical';
  if (ex.giuridica.vincoli.length === 0 && ex.giuridica.formalita.length === 0) {
    if (ex.meta.not_found.some((n) => /vincol|formalit/i.test(n))) return 'unknown';
    return 'ok';
  }
  if (hasVerifyVincolo(ex)) return 'verify';
  if (ex.giuridica.vincoli.length > 0 || ex.giuridica.formalita.length > 0) return 'verify';
  return 'unknown';
}

function occupazione(ex: AsteExtractionV1): SemaforoLevel {
  const stato = (ex.giuridica.stato_occupazione.stato ?? '').toLowerCase();
  const det = (ex.giuridica.stato_occupazione.dettaglio ?? '').toLowerCase();
  const opp = (ex.giuridica.stato_occupazione.opponibilita ?? '').toLowerCase();
  const blob = `${stato} ${det} ${opp}`;
  if (!stato && !det) return 'unknown';
  if (/libero|vacant|free/.test(blob) && !/occupat/.test(blob)) return 'ok';
  if (/terzo/.test(blob) && /opponib/.test(blob)) return 'critical';
  if (/debitore|esecutat|occupat/.test(blob)) return 'verify';
  return 'unknown';
}

function conformita(
  block: { stato: string | null; dettaglio: string | null },
  difformita: AsteExtractionV1['urbanistica']['difformita'],
  kind: 'urb' | 'cat',
): SemaforoLevel {
  const stato = (block.stato ?? '').toLowerCase();
  const det = (block.dettaglio ?? '').toLowerCase();
  const blob = `${stato} ${det}`;
  const relevant = difformita.filter((d) => {
    const dblob = d.descrizione.toLowerCase();
    if (kind === 'urb') return /urban|edil|abitab|agibil/.test(dblob) || difformita.length > 0;
    return /catast|rendita|planimetr/.test(dblob) || difformita.length > 0;
  });
  if (/non sanabile|insanabile|abuso/.test(blob) || relevant.some((d) => d.sanabile === false)) {
    return 'critical';
  }
  if (/conforme|regolare|ok/.test(blob) && relevant.every((d) => d.sanabile !== false)) {
    if (relevant.some((d) => d.sanabile === true)) return 'verify';
    return 'ok';
  }
  if (relevant.some((d) => d.sanabile === true) || /difform|sanabil/.test(blob)) return 'verify';
  if (!stato && relevant.length === 0) return 'unknown';
  return 'verify';
}

function condizioneImmobile(ex: AsteExtractionV1): SemaforoLevel {
  const stato = (ex.condizioni.stato_manutentivo ?? '').toLowerCase();
  const impianti = (ex.condizioni.impianti ?? '').toLowerCase();
  const blob = `${stato} ${impianti}`;
  if (/inagib|strutturale|pericolo|croll/.test(blob)) return 'critical';
  if (ex.condizioni.lavori_stimati || /lavori|ristruttur|da fare|necessit/.test(blob)) {
    return 'verify';
  }
  if (/buono|ordinario|ottimo|discreto|good|ordinary/.test(blob)) return 'ok';
  if (!stato && !impianti) return 'unknown';
  return 'verify';
}

function speseCondominiali(ex: AsteExtractionV1): SemaforoLevel {
  const arrears = ex.spese.condominiali_arretrate;
  const base = ex.economics.prezzo_base?.value;
  if (!arrears) {
    if (ex.meta.not_found.some((n) => /condominial/i.test(n))) return 'verify';
    return 'verify';
  }
  if (base == null || base <= 0) return 'verify';
  const ratio = arrears.value / base;
  if (ratio >= 0.05) return 'critical';
  return 'ok';
}

const ECONOMICS_KEYS = [
  'valore_stima',
  'prezzo_base',
  'offerta_minima',
  'cauzione_pct',
  'rilancio_minimo',
  'superficie_commerciale_mq',
] as const;

function rischioAsta(ex: AsteExtractionV1): SemaforoLevel {
  const docs = ex.meta.documents ?? [];
  const types = new Set(docs.map((d) => d.doc_type));
  if (!types.has('perizia') || !types.has('avviso')) return 'critical';
  const missingEconomics = ECONOMICS_KEYS.filter((k) => ex.economics[k] == null);
  const notFoundEcon = ex.meta.not_found.filter((n) =>
    ECONOMICS_KEYS.some((k) => n.toLowerCase().includes(k) || n.toLowerCase().includes('economic')),
  );
  if (missingEconomics.length > 0 || notFoundEcon.length > 0) return 'verify';
  return 'ok';
}

/** Pure mapper — unit-test the §5.3 rule table here. */
export function computeSemaforo(extraction: AsteExtractionV1): AsteSemaforo {
  return {
    vincoli_gravami: vincoliGravami(extraction),
    occupazione: occupazione(extraction),
    conformita_urbanistica: conformita(
      extraction.urbanistica.conformita_urbanistica,
      extraction.urbanistica.difformita,
      'urb',
    ),
    conformita_catastale: conformita(
      extraction.urbanistica.conformita_catastale,
      extraction.urbanistica.difformita,
      'cat',
    ),
    condizione_immobile: condizioneImmobile(extraction),
    spese_condominiali: speseCondominiali(extraction),
    rischio_asta: rischioAsta(extraction),
    buyer_readiness: 'unknown',
  };
}
