import corpusJson from './EC_WA_INTAKE_strings_v1.json';
import kbJson from './kb-cards.json';

/** Customer-facing group name. Legal controller is a separate open question. */
export const GROUP_DISPLAY_NAME = 'Ayni Group Italia';

export const PARTIAL_AFTER_MS = 23 * 60 * 60 * 1000;
export const LEAD_LINK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Locales a person can actually take a call in. Default from the corpus.
 * Not hardcoded in customer copy — the note string still comes from the corpus.
 */
export const STAFFED_CALL_LOCALES = ['it', 'en', 'es'] as const;

/**
 * Shipping gate. A locale is in the picker only when this is true AND
 * `strings.<locale>.review` is `approved` AND every Italian key is present.
 * AZM approved the eight intake locales on 10 Nov 2026. French cards stay
 * in kb-cards.json and stay out of the picker.
 */
export const LOCALE_SHIPPED: Record<string, boolean> = {
  it: true,
  en: true,
  es: true,
  hi: true,
  ur: true,
  pa: true,
  bn: true,
  ar: true,
  fr: false,
};

export type Corpus = typeof corpusJson;
export type LocalePack = Corpus['strings'][keyof Corpus['strings']];

export const corpus: Corpus = corpusJson;
export const kbCards = kbJson.cards as Record<string, Record<string, string>>;
export const bookingLocales = new Set(Object.keys(kbJson.bookingKeys));

const ITALIAN_KEYS = Object.keys(corpus.strings.it.t);

export function pack(locale: string): LocalePack | undefined {
  return corpus.strings[locale as keyof Corpus['strings']];
}

export function hasEveryKey(locale: string): boolean {
  const row = pack(locale);
  if (!row) return false;
  return ITALIAN_KEYS.every((key) => typeof row.t[key as keyof typeof row.t] === 'string' && row.t[key as keyof typeof row.t].length > 0);
}

export type ShippingInput = {
  reviews?: Record<string, string>;
  shipped?: Record<string, boolean>;
};

/** Locales that may appear in the picker. Defaults keep every draft out. */
export function pickerLocales(input: ShippingInput = {}): string[] {
  const reviews = input.reviews ?? Object.fromEntries(corpus.locales.map((code) => [code, pack(code)?.review ?? 'draft']));
  const shipped = input.shipped ?? LOCALE_SHIPPED;
  return corpus.locales.filter((code) => reviews[code] === 'approved' && shipped[code] === true && hasEveryKey(code));
}

export function fill(locale: string, template: string, extra: { n?: number } = {}): string {
  const urls = pack(locale)?.urls;
  return template
    .replaceAll('{privacy_url}', urls?.privacy_url ?? '')
    .replaceAll('{legenda_upload_url}', urls?.legenda_upload_url ?? '')
    .replaceAll('{site_url}', urls?.site_url ?? '')
    .replaceAll('{n}', extra.n == null ? '{n}' : String(extra.n));
}

export function text(locale: string, key: string, extra?: { n?: number }): string {
  const row = pack(locale);
  const raw = row?.t[key as keyof NonNullable<typeof row>['t']];
  if (typeof raw !== 'string') {
    throw new Error(`intake string missing: ${locale}.${key}`);
  }
  return fill(locale, raw, extra);
}

/** Mundida cards for reviewed locales; corpus drafts for Punjabi and Bengali. */
export function routeCard(locale: string, route: string): string | null {
  if (locale === 'pa' || locale === 'bn') {
    const card = corpus.route_cards_new_locales[locale]?.t[route as 'route_buy'];
    return card ?? null;
  }
  return kbCards[locale]?.[route] ?? null;
}

/** `{n}` counts the route questions plus name, contact, and the possible call-time question. */
export function questionCount(route: string): number {
  const flow = corpus.flows[route as keyof Corpus['flows']];
  return (flow?.length ?? 0) + 3;
}

/**
 * `close.call_time` is asked only after the customer chooses a call.
 * The corpus `close` array documents that; it is not a list of message ids.
 */
export function questionIds(route: string, answers: Record<string, string> = {}): string[] {
  const flow = corpus.flows[route as keyof Corpus['flows']];
  const close = ['close.name', 'close.contact'];
  if (answers['close.contact'] === 'call') close.push('close.call_time');
  return [...(flow ?? []), ...close];
}

export type LimitViolation = { locale: string; key: string; length: number; limit: number };

/** Lengths after placeholders are filled. List-row titles and reply buttons included. */
export function limitViolations(): LimitViolation[] {
  const limits = corpus.whatsapp_limits;
  const out: LimitViolation[] = [];
  const consider = (locale: string, key: string, filled: string) => {
    let limit = limits.body;
    if (key.endsWith('.desc')) limit = limits.row_desc;
    else if (key.endsWith('.title') || key.includes('.rows.')) limit = limits.row_title;
    else if (key.endsWith('.button') || key.includes('.buttons.') || key === 'intake.skip') limit = limits.reply_button;
    if (filled.length > limit) out.push({ locale, key, length: filled.length, limit });
  };
  for (const locale of corpus.locales) {
    const row = pack(locale);
    if (!row) continue;
    for (const [key, value] of Object.entries(row.t)) consider(locale, key, fill(locale, value, { n: 12 }));
    for (const route of Object.keys(corpus.flows)) {
      const card = routeCard(locale, route);
      if (card) consider(locale, `card.${route}`, card);
    }
  }
  consider('selector', 'body', corpus.selector.body);
  consider('selector', 'button', corpus.selector.button);
  return out;
}
