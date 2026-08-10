import rawLedger from '../config/sell-privately/promises.json';
import {
  type BlockState,
  type PromiseEntry,
  type PromiseLedger,
  type PromiseStatus,
  validateLedger,
  visiblePromiseEntries,
} from './promiseLedger';

export type { BlockState, PromiseEntry, PromiseLedger, PromiseStatus };
export { visiblePromiseEntries };

const LOCALIZED_PATHS = {
  it: '/vendi-da-privato',
  en: '/sell-privately',
  /** Verification pack / ES master slug (T33). */
  es: '/vender-entre-particulares',
} as const;

/** Previous ES slug — keep rewrite + redirect compatibility. */
export const ES_SELL_PRIVATELY_LEGACY_PATH = '/vender-como-particular';

export type SellPrivatelyLocale = keyof typeof LOCALIZED_PATHS;

let cached: PromiseLedger | null = null;

export function getSellPrivatelyLedger(): PromiseLedger {
  if (!cached) {
    cached = validateLedger(rawLedger);
  }
  return cached;
}

export function sellPrivatelyPath(locale: string): string {
  if (locale === 'en') return LOCALIZED_PATHS.en;
  if (locale === 'es') return LOCALIZED_PATHS.es;
  return LOCALIZED_PATHS.it;
}

export function sellPrivatelyAbsoluteUrl(locale: string, site = 'https://easycasaita.com'): string {
  return `${site}/${locale}${sellPrivatelyPath(locale)}`;
}

/** it / en / es + x-default (defaults to IT). */
export function sellPrivatelyLanguageAlternates(
  site = 'https://easycasaita.com',
): Record<string, string> {
  return {
    it: sellPrivatelyAbsoluteUrl('it', site),
    en: sellPrivatelyAbsoluteUrl('en', site),
    es: sellPrivatelyAbsoluteUrl('es', site),
    'x-default': sellPrivatelyAbsoluteUrl('it', site),
  };
}

/**
 * Agency-side customary fee estimate — **counsel-gate T02**.
 * Do not call from public UI while `blocks.savingsFigures` !== `live`.
 */
export function estimateAgencySavingEur(salePriceEur: number): {
  net: number;
  withIva: number;
} {
  const net = Math.round(salePriceEur * 0.03);
  const withIva = Math.round(net * 1.22);
  return { net, withIva };
}

export function showSavingsFigures(ledger: PromiseLedger = getSellPrivatelyLedger()): boolean {
  return ledger.blocks.savingsFigures === 'live';
}

export function showSavingsFallback(ledger: PromiseLedger = getSellPrivatelyLedger()): boolean {
  return ledger.blocks.savingsFigures === 'fallback';
}

export function showMediazioneBoundary(ledger: PromiseLedger = getSellPrivatelyLedger()): boolean {
  return ledger.blocks.mediazioneCopy === 'live';
}

export function showMediazioneFallback(ledger: PromiseLedger = getSellPrivatelyLedger()): boolean {
  return ledger.blocks.mediazioneCopy === 'fallback';
}
