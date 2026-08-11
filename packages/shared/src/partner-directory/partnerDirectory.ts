/**
 * EC-S-T28/T29 — neutral partner directory helpers.
 * No fees, no conversion tracking, no paid preferential ordering.
 */

export const PARTNER_DIRECTORY_CATEGORIES = [
  'notaio',
  'geometra',
  'ape_certifier',
  'photographer',
  'virtual_tour',
] as const;

export type PartnerDirectoryCategory = (typeof PARTNER_DIRECTORY_CATEGORIES)[number];

export function isPartnerDirectoryCategory(raw: string): raw is PartnerDirectoryCategory {
  return (PARTNER_DIRECTORY_CATEGORIES as readonly string[]).includes(raw);
}

/** Strip common referral/tracking query params from contact URLs (privacy + row-9 caution). */
const TRACKING_KEYS =
  /^(utm_|ref$|referrer$|referral|fbclid|gclid|msclkid|mc_|yclid)/i;

export function sanitizePartnerContact(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
    const url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
    const keys = [...url.searchParams.keys()];
    for (const k of keys) {
      if (TRACKING_KEYS.test(k)) url.searchParams.delete(k);
    }
    const qs = url.searchParams.toString();
    const path = `${url.origin}${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`;
    return hasScheme ? path : path.replace(/^https:\/\//, '');
  } catch {
    // mailto:/tel: or free text — return trimmed as-is
    return trimmed;
  }
}

export function assertNoReferralTracking(contact: string): boolean {
  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(contact);
    const url = new URL(hasScheme ? contact : `https://${contact}`);
    for (const k of url.searchParams.keys()) {
      if (TRACKING_KEYS.test(k)) return false;
    }
    return true;
  } catch {
    return true;
  }
}
