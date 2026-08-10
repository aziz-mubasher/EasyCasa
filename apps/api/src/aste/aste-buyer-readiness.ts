import type { AsteExtractionV1, AsteSemaforo, SemaforoLevel } from './extraction-schema';

/**
 * EC-24 — buyer profile + deterministic buyer_readiness (pure; unit-tested).
 * Checklist item keys map to it/en message catalogs on the web (counsel-marked).
 */

export type BuyerResidency = 'it_resident' | 'eu_nonresident' | 'non_eu';
export type BuyerPurpose = 'prima_casa' | 'investimento';

export type AsteBuyerProfile = {
  residency: BuyerResidency | null;
  purpose: BuyerPurpose | null;
  has_cf: boolean | null;
  has_pec_firma: boolean | null;
  financing_needed: boolean | null;
};

export type BuyerChecklistItem = {
  key: string;
  level: Exclude<SemaforoLevel, 'unknown'>;
};

export type BuyerReadinessResult = {
  level: SemaforoLevel;
  checklist: BuyerChecklistItem[];
  profile_skipped: boolean;
};

export function emptyBuyerProfile(): AsteBuyerProfile {
  return {
    residency: null,
    purpose: null,
    has_cf: null,
    has_pec_firma: null,
    financing_needed: null,
  };
}

export function isBuyerProfileSkipped(profile: AsteBuyerProfile | null | undefined): boolean {
  if (!profile) return true;
  return (
    profile.residency == null &&
    profile.purpose == null &&
    profile.has_cf == null &&
    profile.has_pec_firma == null &&
    profile.financing_needed == null
  );
}

/** Pure mapper — same style as computeSemaforo. */
export function computeBuyerReadiness(
  profile: AsteBuyerProfile | null | undefined,
  extraction: AsteExtractionV1 | null | undefined,
): BuyerReadinessResult {
  if (isBuyerProfileSkipped(profile)) {
    return { level: 'unknown', checklist: [], profile_skipped: true };
  }

  const p = profile!;
  const checklist: BuyerChecklistItem[] = [];
  let worst: SemaforoLevel = 'ok';

  const bump = (level: Exclude<SemaforoLevel, 'unknown'>, key: string) => {
    checklist.push({ key, level });
    if (level === 'critical') worst = 'critical';
    else if (level === 'verify' && worst !== 'critical') worst = 'verify';
  };

  if (p.residency === 'non_eu' && p.has_cf === false) {
    bump('verify', 'cf_required_non_eu');
  } else if (p.residency === 'non_eu' && p.has_cf == null) {
    bump('verify', 'cf_status_unknown_non_eu');
  } else if (p.residency === 'eu_nonresident' && p.has_cf === false) {
    bump('verify', 'cf_recommended_eu');
  }

  const modalita = extraction?.procedura?.modalita ?? null;
  if ((modalita === 'telematica' || modalita === 'mista') && p.has_pec_firma === false) {
    bump('verify', 'pec_firma_required_telematica');
  } else if ((modalita === 'telematica' || modalita === 'mista') && p.has_pec_firma == null) {
    bump('verify', 'pec_firma_status_unknown');
  }

  if (p.financing_needed === true) {
    bump('verify', 'financing_timeline');
  }

  if (p.residency === 'non_eu') {
    bump('verify', 'non_eu_eligibility_counsel');
  }

  if (checklist.length === 0) {
    return { level: 'ok', checklist: [{ key: 'buyer_ready', level: 'ok' }], profile_skipped: false };
  }

  return { level: worst, checklist, profile_skipped: false };
}

/** Merge buyer_readiness into an existing semaforo object. */
export function applyBuyerReadinessToSemaforo(
  semaforo: AsteSemaforo | null | undefined,
  readiness: BuyerReadinessResult,
): AsteSemaforo {
  const base: AsteSemaforo = semaforo ?? {
    vincoli_gravami: 'unknown',
    occupazione: 'unknown',
    conformita_urbanistica: 'unknown',
    conformita_catastale: 'unknown',
    condizione_immobile: 'unknown',
    spese_condominiali: 'unknown',
    rischio_asta: 'unknown',
    buyer_readiness: 'unknown',
  };
  return { ...base, buyer_readiness: readiness.level };
}
