/** Map inbound menu choice → Message 2 locale (KB §13). */

const DIGIT_MAP: Record<string, string> = {
  '1': 'it',
  '2': 'en',
  '3': 'es',
  '4': 'fr',
  '5': 'ro',
  '6': 'ur',
  '7': 'pnb',
  '8': 'pa',
  '9': 'hi',
  '10': 'bn',
  '11': 'ar',
  '12': 'ru',
};

/** Eastern-Arabic, Persian, Devanagari, Gurmukhi, Bengali digit → ASCII 0-9 */
const UNICODE_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  '੦': '0', '੧': '1', '੨': '2', '੩': '3', '੪': '4', '੫': '5', '੬': '6', '੭': '7', '੮': '8', '੯': '9',
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

function normalizeDigits(input: string): string {
  let out = '';
  for (const ch of input.trim()) {
    out += UNICODE_DIGITS[ch] ?? ch;
  }
  return out.replace(/\s+/g, '');
}

const NAME_MAP: Array<{ pattern: RegExp; locale: string }> = [
  { pattern: /\bitaliano?\b/i, locale: 'it' },
  { pattern: /\benglish\b/i, locale: 'en' },
  { pattern: /\bespa[nñ]ol\b/i, locale: 'es' },
  { pattern: /\bfran[cç]ais\b/i, locale: 'fr' },
  { pattern: /\from[aă]n[aă]\b/i, locale: 'ro' },
  { pattern: /\burdu\b|اردو/i, locale: 'ur' },
  { pattern: /\bpunjabi\b/i, locale: 'pnb' },
  { pattern: /ਪੰਜਾਬੀ/i, locale: 'pa' },
  { pattern: /\bhindi\b|हिन्दी|हिंदी/i, locale: 'hi' },
  { pattern: /\bbengali\b|\bbangla\b|বাংলা/i, locale: 'bn' },
  { pattern: /\barabic\b|عربي|العربية/i, locale: 'ar' },
  { pattern: /\brussian\b|\bukrainian\b|Русский/i, locale: 'ru' },
];

export function parseMenuChoice(raw: string): string | null {
  const norm = normalizeDigits(raw);
  const asNum = norm.match(/^(10|11|12|[1-9])$/);
  if (asNum) return DIGIT_MAP[asNum[1]!] ?? null;
  const text = raw.normalize('NFKC').trim().toLowerCase();
  for (const row of NAME_MAP) {
    if (row.pattern.test(text) || row.pattern.test(raw)) return row.locale;
  }
  return null;
}