/** Languages the final report can be shown in. Source extraction is always Italian. */

export const ASTE_REPORT_CONTENT_LANGS = [
  'it',
  'en',
  'es',
  'ur',
  'hi',
  'pa',
  'ro',
  'sq',
  'ar',
  'uk',
  'bn',
  'tl',
] as const;

export type AsteReportContentLang = (typeof ASTE_REPORT_CONTENT_LANGS)[number];

export const ASTE_SOURCE_REPORT_LANG: AsteReportContentLang = 'it';

/** Native labels for the report language picker (not site chrome). */
export const ASTE_REPORT_LANG_LABELS = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
  ur: 'اردو',
  hi: 'हिन्दी',
  pa: 'ਪੰਜਾਬੀ',
  ro: 'Română',
  sq: 'Shqip',
  ar: 'العربية',
  uk: 'Українська',
  bn: 'বাংলা',
  tl: 'Tagalog',
} as const satisfies Record<AsteReportContentLang, string>;

const INTL_LOCALE: Record<AsteReportContentLang, string> = {
  it: 'it-IT',
  en: 'en-GB',
  es: 'es-ES',
  ur: 'ur-PK',
  hi: 'hi-IN',
  pa: 'pa-Guru-IN',
  ro: 'ro-RO',
  sq: 'sq-AL',
  ar: 'ar',
  uk: 'uk-UA',
  bn: 'bn-BD',
  tl: 'fil-PH',
};

export function isAsteReportContentLang(raw: string | undefined | null): raw is AsteReportContentLang {
  return Boolean(raw && (ASTE_REPORT_CONTENT_LANGS as readonly string[]).includes(raw));
}

export function parseAsteReportContentLang(
  raw: string | undefined | null,
  fallback: AsteReportContentLang = ASTE_SOURCE_REPORT_LANG,
): AsteReportContentLang {
  return isAsteReportContentLang(raw) ? raw : fallback;
}

/** Italian source is shown as-is. Every other picker language is translated. */
export function asteReportNeedsTranslate(lang: AsteReportContentLang): boolean {
  return lang !== ASTE_SOURCE_REPORT_LANG;
}

export function asteReportLangRtl(lang: AsteReportContentLang): boolean {
  return lang === 'ar' || lang === 'ur';
}

export function asteReportLangIntl(lang: string | undefined | null): string {
  if (isAsteReportContentLang(lang)) return INTL_LOCALE[lang];
  return 'it-IT';
}
