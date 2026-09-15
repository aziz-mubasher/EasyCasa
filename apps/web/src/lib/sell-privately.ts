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

export type StepChip = 'live' | 'coming' | 'you';

export type StepEntry = {
  id: string;
  status: StepChip;
  tasks: string[];
  note?: string;
};

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
 * How-it-works chips are page UI bound to ledger rows (or a fixed chip).
 * `you` = the seller's by design, not a missing feature.
 * list stays coming until assisted-draft + mandatory review ships (R4 energy
 * block is P11, a different promise).
 */
const HOW_IT_WORKS_STEPS: ReadonlyArray<{
  id: string;
  promiseId: 'P2' | 'P3' | 'P5' | 'P6' | null;
  chip?: StepChip;
  fallbackStatus: StepChip;
}> = [
  { id: 'price', promiseId: 'P2', fallbackStatus: 'coming' },
  { id: 'docs', promiseId: 'P6', fallbackStatus: 'coming' },
  { id: 'verify', promiseId: 'P3', fallbackStatus: 'coming' },
  { id: 'list', promiseId: null, fallbackStatus: 'coming' },
  { id: 'meet', promiseId: null, chip: 'you', fallbackStatus: 'you' },
  { id: 'viewings', promiseId: 'P5', fallbackStatus: 'coming' },
];

let cached: PromiseLedger | null = null;

export function getSellPrivatelyLedger(): PromiseLedger {
  if (!cached) {
    cached = validateLedger(rawLedger);
  }
  return cached;
}

/** Benefit tiles / JSON-LD = ordered visible promises. Retracted never render. */
export function getSellPrivatelyBenefits(
  ledger: PromiseLedger = getSellPrivatelyLedger(),
): PromiseEntry[] {
  return visiblePromiseEntries(promiseEntries(ledger), ledger);
}

function chipFromPromiseState(state: PromiseStatus, fallback: StepChip): StepChip {
  if (state === 'live') return 'live';
  if (state === 'coming') return 'coming';
  return fallback;
}

/** How-it-works steps. Retracted bindings are dropped. */
export function getSellPrivatelySteps(
  ledger: PromiseLedger = getSellPrivatelyLedger(),
): StepEntry[] {
  const steps: StepEntry[] = [];
  for (const { id, promiseId, chip, fallbackStatus } of HOW_IT_WORKS_STEPS) {
    if (chip === 'you') {
      steps.push({ id, status: 'you', tasks: [], note: undefined });
      continue;
    }
    if (promiseId) {
      const p = ledger.promises[promiseId];
      if (p.state === 'retracted' || p.state === 'hidden') continue;
      if (!p.licence_state.includes(ledger.companyLicenceState)) continue;
      steps.push({
        id,
        status: chipFromPromiseState(p.state, fallbackStatus),
        tasks: p.tasks,
        note: p.note,
      });
      continue;
    }
    steps.push({ id, status: fallbackStatus, tasks: [], note: undefined });
  }
  return steps;
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

export function sellPrivatelyOgLocale(locale: string): string {
  if (locale === 'it') return 'it_IT';
  if (locale === 'es') return 'es_ES';
  return 'en';
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

/** P12 delibera block — educational copy only while coming. */
export function showBuyerPreapprovalComing(ledger: PromiseLedger = getSellPrivatelyLedger()): boolean {
  return ledger.promises.P12.state === 'coming';
}

export function showBuyerPreapprovalLive(ledger: PromiseLedger = getSellPrivatelyLedger()): boolean {
  return (
    ledger.promises.P12.state === 'live' &&
    ledger.promises.P12.licence_state.includes(ledger.companyLicenceState)
  );
}

export function showEnergyRequiredLive(ledger: PromiseLedger = getSellPrivatelyLedger()): boolean {
  return (
    ledger.promises.P11.state === 'live' &&
    ledger.promises.P11.licence_state.includes(ledger.companyLicenceState)
  );
}
