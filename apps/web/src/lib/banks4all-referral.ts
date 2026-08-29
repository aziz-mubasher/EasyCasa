/**
 * Banks4All outbound referral URLs — Phase A (referral only, no data exchange).
 * Update destinations here; do not scatter hardcoded banks4all.eu links in UI code.
 */

export const BANKS4ALL_SITE_ORIGIN = 'https://www.banks4all.eu' as const;

export const BANKS4ALL_PORTAL_ORIGIN = 'https://portal.banks4all.eu' as const;

export type Banks4AllSiteLocale = 'it' | 'en' | 'es';

export type Banks4AllReferralEntry =
  | 'propertyPlanPortal'
  | 'propertyInvestmentPlan'
  | 'discoveryCall'
  | 'transparency'
  | 'nibProperty';

/** Optional campaign attribution — never include analysis/user/property identifiers. */
export type Banks4AllReferralUtm = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
};

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

const DISCOVERY_CALL_PATH: Record<Banks4AllSiteLocale, string> = {
  it: '/it/book/discovery-call',
  en: '/en/book/discovery-call',
  es: '/es/book/discovery-call',
};

const TRANSPARENCY_PATH: Record<Banks4AllSiteLocale, string> = {
  it: '/it/trasparenza',
  en: '/en/transparency',
  es: '/es/transparencia',
};

/** NiB Property — Banks4All sister product (locale path as on banks4all.eu). */
const NIB_PROPERTY_PATH: Record<Banks4AllSiteLocale, string> = {
  it: '/it/nib',
  en: '/en/nib',
  es: '/es/nib',
};

/** Default outbound entry: free plan request on the Banks4All portal. */
export const DEFAULT_BANKS4ALL_REFERRAL_ENTRY: Banks4AllReferralEntry = 'propertyPlanPortal';

/** EC-28 — aste report campaign UTMs (no per-analysis identifiers). */
export const ASTE_REPORT_BANKS4ALL_UTM: Banks4AllReferralUtm = {
  utm_source: 'easycasa',
  utm_medium: 'aste_report',
  utm_campaign: 'aste',
};

export function resolveBanks4AllSiteLocale(easycasaLocale: string): Banks4AllSiteLocale {
  if (easycasaLocale === 'en' || easycasaLocale === 'es') return easycasaLocale;
  return 'it';
}

function appendUtm(url: string, utm?: Banks4AllReferralUtm): string {
  if (!utm) return url;
  const u = new URL(url);
  u.searchParams.set('utm_source', utm.utm_source);
  u.searchParams.set('utm_medium', utm.utm_medium);
  u.searchParams.set('utm_campaign', utm.utm_campaign);
  return u.toString();
}

/**
 * Outbound URL — no query params by default (listing Phase A).
 * Optional `utm` for campaign attribution only (EC-28 aste report).
 */
export function getBanks4AllReferralUrl(
  easycasaLocale: string,
  entry: Banks4AllReferralEntry = DEFAULT_BANKS4ALL_REFERRAL_ENTRY,
  utm?: Banks4AllReferralUtm,
): string {
  const b4aLocale = resolveBanks4AllSiteLocale(easycasaLocale);
  let base: string;
  if (entry === 'propertyPlanPortal') {
    base = `${BANKS4ALL_PORTAL_ORIGIN}${PROPERTY_PLAN_PORTAL_PATH[b4aLocale]}`;
  } else if (entry === 'discoveryCall') {
    base = `${BANKS4ALL_SITE_ORIGIN}${DISCOVERY_CALL_PATH[b4aLocale]}`;
  } else if (entry === 'transparency') {
    base = `${BANKS4ALL_SITE_ORIGIN}${TRANSPARENCY_PATH[b4aLocale]}`;
  } else if (entry === 'nibProperty') {
    base = `${BANKS4ALL_SITE_ORIGIN}${NIB_PROPERTY_PATH[b4aLocale]}`;
  } else {
    base = `${BANKS4ALL_SITE_ORIGIN}${PROPERTY_INVESTMENT_PLAN_PATH[b4aLocale]}`;
  }
  return appendUtm(base, utm);
}
