import ledger from '../config/sell-privately/promises.json';

export type PromiseStatus = 'live' | 'coming' | 'hidden';

export type PromiseEntry = {
  id: string;
  status: PromiseStatus;
  roadmap: string | null;
};

export type SellPrivatelyGates = {
  /** When false (T02 pending): no € savings figures, slider, or AGCM footnote. */
  savingsFigures: boolean;
  /** When false (T04 pending): hide portal-vs-mediatore block. */
  mediazioneBoundaryCopy: boolean;
};

export type SellPrivatelyLedger = {
  version: number;
  updatedAt: string;
  gates: SellPrivatelyGates;
  benefits: PromiseEntry[];
  steps: PromiseEntry[];
};

const LOCALIZED_PATHS = {
  it: '/vendi-da-privato',
  en: '/sell-privately',
  es: '/vender-como-particular',
} as const;

export type SellPrivatelyLocale = keyof typeof LOCALIZED_PATHS;

export function isPromiseStatus(value: string): value is PromiseStatus {
  return value === 'live' || value === 'coming' || value === 'hidden';
}

export function getSellPrivatelyLedger(): SellPrivatelyLedger {
  return ledger as SellPrivatelyLedger;
}

/** Visible entries only — `hidden` is omitted entirely. */
export function visiblePromiseEntries(entries: PromiseEntry[]): PromiseEntry[] {
  return entries.filter((e) => e.status !== 'hidden');
}

export function sellPrivatelyPath(locale: string): string {
  if (locale === 'en') return LOCALIZED_PATHS.en;
  if (locale === 'es') return LOCALIZED_PATHS.es;
  return LOCALIZED_PATHS.it;
}

export function sellPrivatelyAbsoluteUrl(locale: string, site = 'https://easycasaita.com'): string {
  return `${site}/${locale}${sellPrivatelyPath(locale)}`;
}

export function sellPrivatelyLanguageAlternates(
  site = 'https://easycasaita.com',
): Record<string, string> {
  return {
    it: sellPrivatelyAbsoluteUrl('it', site),
    en: sellPrivatelyAbsoluteUrl('en', site),
    es: sellPrivatelyAbsoluteUrl('es', site),
  };
}

/**
 * Agency-side customary fee estimate — **counsel-gate T02**.
 * Do not call from public UI while `gates.savingsFigures` is false.
 */
export function estimateAgencySavingEur(salePriceEur: number): {
  net: number;
  withIva: number;
} {
  const net = Math.round(salePriceEur * 0.03);
  const withIva = Math.round(net * 1.22);
  return { net, withIva };
}
