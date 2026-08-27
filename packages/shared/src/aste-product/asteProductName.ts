/**
 * EC-RENAME-1 — canonical auction product naming (single source of truth).
 *
 * Display name / short form / product slug live here. Every in-repo surface
 * that shows the product brand must read from this module (or from i18n keys
 * that are asserted to match these values in CI).
 *
 * Route prefix `/aste` is intentionally unchanged (SEO / inbound links = ops).
 */

export type AsteProductLocale = 'it' | 'en' | 'es';

/** Product identity slug (not a URL path). */
export const ASTE_PRODUCT_SLUG = 'dossier-asta' as const;

/** Public route prefix — do not treat as display name. */
export const ASTE_PRODUCT_ROUTE_PREFIX = '/aste' as const;

export const ASTE_PRODUCT_NAME = {
  it: 'Dossier Asta',
  en: 'Auction Dossier',
  es: 'Dossier de Subasta',
} as const satisfies Record<AsteProductLocale, string>;

/** Short form for tight UI (badges, Stripe line prefixes, etc.). */
export const ASTE_PRODUCT_NAME_SHORT = {
  it: 'Dossier',
  en: 'Dossier',
  es: 'Dossier',
} as const satisfies Record<AsteProductLocale, string>;

export function asteProductDisplayName(locale: AsteProductLocale = 'it'): string {
  return ASTE_PRODUCT_NAME[locale] ?? ASTE_PRODUCT_NAME.it;
}

/**
 * Former product display names — must not appear on product surfaces.
 * Kept here so the ban script and unit tests share one list.
 */
export const ASTE_PRODUCT_NAME_LEGACY_BANNED = [
  'Analisi Aste',
  'Auction Analysis',
  'Análisis Aste',
  'Analisis Aste',
] as const;
