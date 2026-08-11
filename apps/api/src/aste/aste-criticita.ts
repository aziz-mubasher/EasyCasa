import type { AsteExtractionV2, AsteSemaforo, SemaforoLevel } from './extraction-schema';

/**
 * EC-24 — criticità cards from semaforo verify/critical dims (deterministic; no € impact guesses).
 * Action copy keys map to message catalogs (it/en).
 */

export type CriticitaCard = {
  dimension: keyof AsteSemaforo;
  level: Extract<SemaforoLevel, 'verify' | 'critical'>;
  /** Stable action key for i18n catalogs. */
  action_key: string;
  /** Italian source snippets from extraction (may be empty). */
  problema_it: string[];
};

const ACTION_KEYS: Record<keyof AsteSemaforo, string> = {
  vincoli_gravami: 'action_vincoli',
  occupazione: 'action_occupazione',
  conformita_urbanistica: 'action_urbanistica',
  conformita_catastale: 'action_catastale',
  condizione_immobile: 'action_condizione',
  spese_condominiali: 'action_spese',
  rischio_asta: 'action_rischio',
  buyer_readiness: 'action_buyer',
};

function snippetsFor(dim: keyof AsteSemaforo, ex: AsteExtractionV2): string[] {
  const out: string[] = [];
  switch (dim) {
    case 'vincoli_gravami':
      for (const v of ex.giuridica.vincoli) {
        if (v.descrizione) out.push(v.descrizione);
      }
      for (const f of ex.giuridica.formalita) {
        if (f.descrizione) out.push(f.descrizione);
      }
      break;
    case 'occupazione': {
      const s = ex.giuridica.stato_occupazione;
      if (s.stato) out.push(s.stato);
      if (s.dettaglio) out.push(s.dettaglio);
      if (s.opponibilita) out.push(s.opponibilita);
      break;
    }
    case 'conformita_urbanistica': {
      const u = ex.urbanistica.conformita_urbanistica;
      if (u.stato) out.push(u.stato);
      if (u.dettaglio) out.push(u.dettaglio);
      for (const d of ex.urbanistica.difformita) {
        if (d.descrizione) out.push(d.descrizione);
      }
      break;
    }
    case 'conformita_catastale': {
      const c = ex.urbanistica.conformita_catastale;
      if (c.stato) out.push(c.stato);
      if (c.dettaglio) out.push(c.dettaglio);
      break;
    }
    case 'condizione_immobile': {
      if (ex.condizioni.stato_manutentivo) out.push(ex.condizioni.stato_manutentivo);
      if (ex.condizioni.impianti) out.push(ex.condizioni.impianti);
      break;
    }
    case 'spese_condominiali':
      for (const o of ex.spese.oneri_acquirente) {
        if (o.descrizione) out.push(o.descrizione);
      }
      break;
    case 'rischio_asta':
      out.push(...ex.meta.not_found.slice(0, 6));
      out.push(...ex.meta.warnings.slice(0, 4));
      break;
    case 'buyer_readiness':
      break;
  }
  return out.filter(Boolean);
}

export function buildCriticitaCards(
  semaforo: AsteSemaforo,
  extraction: AsteExtractionV2,
): CriticitaCard[] {
  const dims = Object.keys(ACTION_KEYS) as Array<keyof AsteSemaforo>;
  const cards: CriticitaCard[] = [];
  for (const dim of dims) {
    const level = semaforo[dim];
    if (level !== 'verify' && level !== 'critical') continue;
    cards.push({
      dimension: dim,
      level,
      action_key: ACTION_KEYS[dim],
      problema_it: snippetsFor(dim, extraction),
    });
  }
  return cards;
}
