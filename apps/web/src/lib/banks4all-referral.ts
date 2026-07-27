/**
 * Banks4All outbound referral URLs — Phase A (referral only, no data exchange).
 * Update destinations here; do not scatter hardcoded banks4all.eu links in UI code.
 */

export const BANKS4ALL_SITE_ORIGIN = 'https://www.banks4all.eu' as const;

export const BANKS4ALL_PORTAL_ORIGIN = 'https://portal.banks4all.eu' as const;

export type Banks4AllSiteLocale = 'it' | 'en' | 'es';

export type Banks4AllReferralEntry = 'propertyPlanPortal' | 'propertyInvestmentPlan';

/** Info page — Property Investment Plan overview (secondary “learn more”). */
const PROPERTY_INVESTMENT_PLAN_PATH: Record<Banks4AllSiteLocale, string> = {
  it: '/it/property-investment-plan',
  en: '/en/property-investment-plan',
  es: '/es/property-investment-plan',
};

/** Portal — free request / signup for the Property Investment Plan (primary CTA). */
const PROPERTY_PLAN_PORTAL_PATH: Record<Banks4AllSiteLocale, string> = {
  it: '/it/property-plan',
  en: '/en/property-plan',
  es: '/es/property-plan',
};

/** Default outbound entry: free plan request on the Banks4All portal. */
export const DEFAULT_BANKS4ALL_REFERRAL_ENTRY: Banks4AllReferralEntry = 'propertyPlanPortal';

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
  const b4aLocale = resolveBanks4AllSiteLocale(easycasaLocale);
  if (entry === 'propertyPlanPortal') {
    return `${BANKS4ALL_PORTAL_ORIGIN}${PROPERTY_PLAN_PORTAL_PATH[b4aLocale]}`;
  }
  return `${BANKS4ALL_SITE_ORIGIN}${PROPERTY_INVESTMENT_PLAN_PATH[b4aLocale]}`;
}
