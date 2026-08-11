/**
 * EC-28 — deterministic trigger for Banks4All financing lane on aste reports.
 * Pure function; no LLM. Priority: financing_need > readiness_financing > mutuabilita.
 */

export type AsteFinancingTrigger =
  | 'financing_need'
  | 'readiness_financing'
  | 'mutuabilita';

export type AsteFinancingTriggerInput = {
  buyerProfile: {
    financing_needed: boolean | null;
  } | null;
  buyerReadiness: {
    checklist: Array<{ key: string; level: string }>;
  } | null;
  extraction: {
    giuridica?: {
      stato_occupazione?: { stato?: string | null } | null;
    } | null;
    urbanistica?: {
      conformita_urbanistica?: { stato?: string | null } | null;
      conformita_catastale?: { stato?: string | null } | null;
      difformita?: unknown[] | null;
    } | null;
  } | null;
  /** Full report only — teaser/EC-27 must pass false/omit. */
  fullReportContext: boolean;
  /** When true (ASTE_REPROCESS_REQUIRED / no ready report), never show. */
  reprocessRequired?: boolean;
};

const READINESS_FINANCING_KEYS = new Set([
  'financing_timeline',
  'non_eu_eligibility_counsel',
]);

const NON_CONFORM_RE =
  /non\s*conform|difform|abuso|non\s*sanabil|irregolar|non\s*regolar/i;

function isOccupied(stato: string | null | undefined): boolean {
  if (stato == null || stato.trim() === '') return false;
  const s = stato.trim().toLowerCase();
  if (s === 'libero' || s === 'libera' || s === 'free') return false;
  return /occupat|locat|affitt|inquilin|debitore/.test(s);
}

function isMutuabilitaMaterial(extraction: AsteFinancingTriggerInput['extraction']): boolean {
  if (!extraction) return false;
  const urb = extraction.urbanistica;
  if (urb) {
    if (Array.isArray(urb.difformita) && urb.difformita.length > 0) return true;
    const cu = urb.conformita_urbanistica?.stato;
    const cc = urb.conformita_catastale?.stato;
    if (cu && NON_CONFORM_RE.test(cu)) return true;
    if (cc && NON_CONFORM_RE.test(cc)) return true;
    if (cu && !/conform/i.test(cu) && cu.trim() !== '') {
      // Explicit non-ok states that aren't "conforme"
      if (/verify|da\s*verific|critic|non\s*ok/i.test(cu)) return true;
    }
  }
  const occ = extraction.giuridica?.stato_occupazione?.stato;
  if (isOccupied(occ)) return true;
  return false;
}

/**
 * Returns the single highest-priority trigger, or null if the block must not render.
 */
export function resolveAsteFinancingTrigger(
  input: AsteFinancingTriggerInput,
): AsteFinancingTrigger | null {
  if (!input.fullReportContext) return null;
  if (input.reprocessRequired) return null;

  if (input.buyerProfile?.financing_needed === true) {
    return 'financing_need';
  }

  const checklist = input.buyerReadiness?.checklist ?? [];
  if (checklist.some((item) => READINESS_FINANCING_KEYS.has(item.key))) {
    return 'readiness_financing';
  }

  if (isMutuabilitaMaterial(input.extraction)) {
    return 'mutuabilita';
  }

  return null;
}

/** Placement: readiness panel for triggers 1–2; after criticità for mutuabilità. */
export function asteFinancingPlacement(
  trigger: AsteFinancingTrigger,
): 'buyer_readiness' | 'after_criticita' {
  if (trigger === 'mutuabilita') return 'after_criticita';
  return 'buyer_readiness';
}
