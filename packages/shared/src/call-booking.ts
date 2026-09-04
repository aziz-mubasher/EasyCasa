import { normalizeProvinceSlug, PROVINCE_BY_SLUG } from './italian-geography';

/**
 * Closed reasons for a staff callback. T04 rows 10–12 stay out:
 * no offer / proposta / negotiation / credit-intake reasons.
 */
export const CALL_BOOKING_REASONS = [
  'sell',
  'buy',
  'legenda',
  'assistito',
  'other',
] as const;

export type CallBookingReason = (typeof CALL_BOOKING_REASONS)[number];

export const CALL_BOOKING_PATH = '/prenota-chiamata';

/** Human URL slugs (IT-first). Canonical reason id is still `sell` / `buy` / … */
export const CALL_REASON_SLUG: Readonly<Record<CallBookingReason, string>> = {
  sell: 'vendere',
  buy: 'comprare',
  legenda: 'easy-legenda',
  assistito: 'acquisto-assistito',
  other: 'altro',
};

const REASON_ALIASES: Readonly<Record<string, CallBookingReason>> = {
  sell: 'sell',
  vendere: 'sell',
  selling: 'sell',
  sell_property: 'sell',
  buy: 'buy',
  comprare: 'buy',
  buying: 'buy',
  buy_property: 'buy',
  legenda: 'legenda',
  'easy-legenda': 'legenda',
  easy_legenda: 'legenda',
  aste: 'legenda',
  auction: 'legenda',
  assistito: 'assistito',
  'acquisto-assistito': 'assistito',
  acquisto_assistito: 'assistito',
  foreign: 'assistito',
  other: 'other',
  altro: 'other',
  otra: 'other',
};

export function isCallBookingReason(value: string): value is CallBookingReason {
  return (CALL_BOOKING_REASONS as readonly string[]).includes(value);
}

export function parseCallBookingReason(raw: string | null | undefined): CallBookingReason | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/\s+/g, '-');
  return REASON_ALIASES[key] ?? null;
}

export function callReasonSlug(reason: CallBookingReason): string {
  return CALL_REASON_SLUG[reason];
}

export function provinceDisplayName(raw: string | null | undefined): string | null {
  const slug = normalizeProvinceSlug(raw);
  if (!slug) return null;
  return PROVINCE_BY_SLUG.get(slug)?.name ?? slug;
}

export type CallBookingLocale = 'it' | 'en' | 'es';

export function parseCallBookingLocale(raw: string | null | undefined): CallBookingLocale {
  if (raw === 'en' || raw === 'es' || raw === 'it') return raw;
  return 'it';
}

export function buildCallBookingPath(input: {
  locale?: CallBookingLocale;
  province: string;
  reason: CallBookingReason;
}): string {
  const locale = input.locale ?? 'it';
  const slug = normalizeProvinceSlug(input.province);
  if (!slug) {
    throw new Error('unknown province');
  }
  const name = PROVINCE_BY_SLUG.get(slug)?.name ?? slug;
  const q = new URLSearchParams({
    provincia: name,
    motivo: CALL_REASON_SLUG[input.reason],
  });
  return `/${locale}${CALL_BOOKING_PATH}?${q.toString()}`;
}

export function buildCallBookingUrl(input: {
  origin: string;
  locale?: CallBookingLocale;
  province: string;
  reason: CallBookingReason;
}): string {
  const origin = input.origin.replace(/\/$/, '');
  return `${origin}${buildCallBookingPath(input)}`;
}

export function parseCallBookingQuery(search: {
  provincia?: string | null;
  province?: string | null;
  motivo?: string | null;
  reason?: string | null;
}): { province: string | null; reason: CallBookingReason | null; provinceName: string | null } {
  const province = normalizeProvinceSlug(search.provincia ?? search.province ?? null);
  const reason = parseCallBookingReason(search.motivo ?? search.reason ?? null);
  return {
    province,
    reason,
    provinceName: provinceDisplayName(province),
  };
}

export function callBookingTaskTitle(input: {
  provinceName: string;
  reasonLabel: string;
}): string {
  return `Call · ${input.provinceName} · ${input.reasonLabel}`;
}

export const CALL_REASON_LABELS: Readonly<
  Record<CallBookingLocale, Record<CallBookingReason, string>>
> = {
  it: {
    sell: 'Vendita immobile',
    buy: 'Acquisto immobile',
    legenda: 'Easy Legenda / aste',
    assistito: 'Acquisto Assistito',
    other: 'Altro',
  },
  en: {
    sell: 'Selling a property',
    buy: 'Buying a property',
    legenda: 'Easy Legenda / auctions',
    assistito: 'Assisted purchase',
    other: 'Something else',
  },
  es: {
    sell: 'Vender un inmueble',
    buy: 'Comprar un inmueble',
    legenda: 'Easy Legenda / subastas',
    assistito: 'Compra asistida',
    other: 'Otro',
  },
};

export function callReasonLabel(reason: CallBookingReason, locale: CallBookingLocale): string {
  return CALL_REASON_LABELS[locale][reason];
}

/** Default due time when the visitor does not pick a slot: +24h. */
export function defaultCallDueAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + 24 * 60 * 60 * 1000);
}

export function resolveCallDueAt(preferredAt: string | null | undefined, from: Date = new Date()): Date {
  if (preferredAt) {
    const parsed = new Date(preferredAt);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > from.getTime()) {
      return parsed;
    }
  }
  return defaultCallDueAt(from);
}
