/**
 * EC-RENAME-2 — canonical auction agent naming (single source of truth).
 * Supersedes EC-RENAME-1 (prior document-product brand).
 *
 * Display name / short form / product slug / tagline live here. Every in-repo
 * surface that shows the product brand must read from this module (or from
 * i18n keys that are asserted to match these values in CI).
 *
 * Route prefix `/aste` is intentionally unchanged (SEO / inbound links = ops).
 *
 * Brand rule (compliance check):
 *   «Una legenda spiega i simboli. Non sceglie il percorso.»
 *   If Legenda recommends a bid, it is out of scope.
 */

export type AsteProductLocale = 'it' | 'en' | 'es';

/** Product identity slug (not a URL path). */
export const ASTE_PRODUCT_SLUG = 'legenda' as const;

/** Public route prefix — do not treat as display name. */
export const ASTE_PRODUCT_ROUTE_PREFIX = '/aste' as const;

/** Display name — same loanword across served locales. */
export const ASTE_PRODUCT_NAME = {
  it: 'Legenda',
  en: 'Legenda',
  es: 'Legenda',
} as const satisfies Record<AsteProductLocale, string>;

/** Short form for tight UI (badges, Stripe line prefixes, etc.). */
export const ASTE_PRODUCT_NAME_SHORT = {
  it: 'Legenda',
  en: 'Legenda',
  es: 'Legenda',
} as const satisfies Record<AsteProductLocale, string>;

/** One-line promise — map key, not a route. */
export const ASTE_PRODUCT_TAGLINE = {
  it: 'Legenda legge la perizia. Nella tua lingua.',
  en: 'Legenda reads the file. In your language.',
  es: 'Legenda lee el expediente. En tu idioma.',
} as const satisfies Record<AsteProductLocale, string>;

/** AI Act art. 50 first-contact disclosure (provider duty). */
export const ASTE_PRODUCT_AI_DISCLOSURE = {
  it: 'Legenda è un assistente AI.',
  en: 'Legenda is an AI assistant.',
  es: 'Legenda es un asistente de IA.',
} as const satisfies Record<AsteProductLocale, string>;

export function asteProductDisplayName(locale: AsteProductLocale = 'it'): string {
  return ASTE_PRODUCT_NAME[locale] ?? ASTE_PRODUCT_NAME.it;
}

export function asteProductTagline(locale: AsteProductLocale = 'it'): string {
  return ASTE_PRODUCT_TAGLINE[locale] ?? ASTE_PRODUCT_TAGLINE.it;
}

export function asteProductAiDisclosure(locale: AsteProductLocale = 'it'): string {
  return ASTE_PRODUCT_AI_DISCLOSURE[locale] ?? ASTE_PRODUCT_AI_DISCLOSURE.it;
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
  'Dossier Asta',
  'Auction Dossier',
  'Dossier de Subasta',
] as const;
