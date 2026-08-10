import rawLedger from '../config/sell-privately/promises.json';
import {
  type BlockState,
  type PromiseEntry,
  type PromiseLedger,
  type PromiseStatus,
  promiseEntries,
  validateLedger,
  visiblePromiseEntries,
} from './promiseLedger';

export type { BlockState, PromiseEntry, PromiseLedger, PromiseStatus };
export { promiseEntries, visiblePromiseEntries };

const LOCALIZED_PATHS = {
  it: '/vendi-da-privato',
  en: '/sell-privately',
  /** Verification pack / ES master slug (T33). */
  es: '/vender-entre-particulares',
} as const;

/** Previous ES slug — keep rewrite + redirect compatibility. */
export const ES_SELL_PRIVATELY_LEGACY_PATH = '/vender-como-particular';

export type SellPrivatelyLocale = keyof typeof LOCALIZED_PATHS;

/**
 * How-it-works step chips are page UI, not separate ledger rows.
 * Bind each step to a promise (or a fixed coming state until a P* exists).
 * list → T07/T13 listing wizard (no P* yet).
 */
const HOW_IT_WORKS_STEPS: ReadonlyArray<{
  id: string;
  promiseId: 'P2' | 'P3' | 'P4' | 'P5' | null;
  fallbackStatus: PromiseStatus;
}> = [
  { id: 'list', promiseId: null, fallbackStatus: 'coming' },
  { id: 'price', promiseId: 'P2', fallbackStatus: 'coming' },
  { id: 'verify', promiseId: 'P3', fallbackStatus: 'coming' },
  { id: 'buyers', promiseId: 'P4', fallbackStatus: 'coming' },
  { id: 'viewings', promiseId: 'P5', fallbackStatus: 'coming' },
];

let cached: PromiseLedger | null = null;

export function getSellPrivatelyLedger(): PromiseLedger {
  if (!cached) {
    cached = validateLedger(rawLedger);
  }
  return cached;
}

/** Benefit tiles = ordered visible promises. */
export function getSellPrivatelyBenefits(
  ledger: PromiseLedger = getSellPrivatelyLedger(),
): PromiseEntry[] {
  return visiblePromiseEntries(promiseEntries(ledger));
}

/** How-it-works steps derived from bound promises. */
export function getSellPrivatelySteps(
  ledger: PromiseLedger = getSellPrivatelyLedger(),
): PromiseEntry[] {
  return visiblePromiseEntries(
    HOW_IT_WORKS_STEPS.map(({ id, promiseId, fallbackStatus }) => {
      if (promiseId) {
        const p = ledger.promises[promiseId];
        return { id, status: p.state, tasks: p.tasks, note: p.note };
      }
      return { id, status: fallbackStatus, tasks: [], note: undefined };
    }),
  );
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
 * Do not call from public UI while `blocks.savingsFigures.state` !== `live`.
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
  return ledger.blocks.savingsFigures.state === 'live';
}

export function showSavingsFallback(ledger: PromiseLedger = getSellPrivatelyLedger()): boolean {
  return ledger.blocks.savingsFigures.state === 'fallback';
}

export function showMediazioneBoundary(ledger: PromiseLedger = getSellPrivatelyLedger()): boolean {
  return ledger.blocks.mediazioneCopy.state === 'live';
}

export function showMediazioneFallback(ledger: PromiseLedger = getSellPrivatelyLedger()): boolean {
  return ledger.blocks.mediazioneCopy.state === 'fallback';
}
