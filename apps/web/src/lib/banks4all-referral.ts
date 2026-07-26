/**
 * Banks4All outbound referral URLs — Phase A (referral only, no data exchange).
 * Update destinations here; do not scatter hardcoded banks4all.eu links in UI code.
 */

export const BANKS4ALL_SITE_ORIGIN = 'https://www.banks4all.eu' as const;

/** Existing-client portal (not the primary qualification entry). */
export const BANKS4ALL_CLIENT_PORTAL_URL = 'https://portal.banks4all.eu' as const;

export type Banks4AllSiteLocale = 'it' | 'en' | 'es';

export type Banks4AllReferralEntry =
  | 'planMutuo'
  | 'pop'
  | 'clientPortal';

/** Plan+Mutuo Phase 1 — Property Investment Plan / mortgage qualification path. */
const PLAN_MUTUO_PATH: Record<Banks4AllSiteLocale, string> = {
  it: '/it/plan-mutuo',
  en: '/en/plan-mutuo',
  es: '/es/plan-mutuo',
};

/** Property Ownership Package — alternate public entry. */
const POP_PATH: Record<Banks4AllSiteLocale, string> = {
  it: '/it/pop',
  en: '/en/pop',
  es: '/es/pop',
};

/** Default public page for financing qualification referrals from EasyCasa. */
export const DEFAULT_BANKS4ALL_REFERRAL_ENTRY: Banks4AllReferralEntry = 'planMutuo';

export function resolveBanks4AllSiteLocale(easycasaLocale: string): Banks4AllSiteLocale {
  if (easycasaLocale === 'en' || easycasaLocale === 'es') return easycasaLocale;
  return 'it';
}

/**
 * Plain outbound URL — no query params (Banks4All has no documented non-PII prefill params for these pages).
 */
export function getBanks4AllReferralUrl(
  easycasaLocale: string,
  entry: Banks4AllReferralEntry = DEFAULT_BANKS4ALL_REFERRAL_ENTRY,
): string {
  if (entry === 'clientPortal') {
    return BANKS4ALL_CLIENT_PORTAL_URL;
  }
  const b4aLocale = resolveBanks4AllSiteLocale(easycasaLocale);
  const path = entry === 'planMutuo' ? PLAN_MUTUO_PATH[b4aLocale] : POP_PATH[b4aLocale];
  return `${BANKS4ALL_SITE_ORIGIN}${path}`;
}
