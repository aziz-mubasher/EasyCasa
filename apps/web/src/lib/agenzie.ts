import rawLedger from '../config/agenzie/promises.json';
import { type PromiseStatus } from './promiseLedger';

export type { PromiseStatus };

export const AGENCY_PROMISE_IDS = ['A1', 'A2', 'A3', 'A4'] as const;
export type AgencyPromiseId = (typeof AGENCY_PROMISE_IDS)[number];

export type AgencyPromiseRecord = {
  state: PromiseStatus;
  tasks: string[];
  note?: string;
};

export type AgenzieLedger = {
  version: number;
  updatedAt: string;
  $schema?: string;
  promises: Record<AgencyPromiseId, AgencyPromiseRecord>;
};

export type AgencyPromiseEntry = {
  id: AgencyPromiseId;
  status: PromiseStatus;
  tasks: string[];
  note?: string;
};

const LOCALIZED_PATHS = {
  it: '/agenzie',
  en: '/for-agencies',
  es: '/agenzie',
} as const;

export type AgenzieLocale = keyof typeof LOCALIZED_PATHS;

export const EN_AGENZIE_LEGACY_PATH = '/agenzie';

const PROMISE_STATUSES: readonly PromiseStatus[] = ['live', 'coming', 'hidden'];

export class AgenzieLedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgenzieLedgerError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateAgenzieLedger(raw: unknown): AgenzieLedger {
  if (!isRecord(raw)) throw new AgenzieLedgerError('ledger: expected object');
  if (typeof raw.version !== 'number' || !Number.isFinite(raw.version)) {
    throw new AgenzieLedgerError('version: finite number required');
  }
  if (typeof raw.updatedAt !== 'string' || raw.updatedAt.length === 0) {
    throw new AgenzieLedgerError('updatedAt: non-empty string required');
  }
  if (!isRecord(raw.promises)) throw new AgenzieLedgerError('promises: object required');

  const promises = {} as Record<AgencyPromiseId, AgencyPromiseRecord>;
  for (const id of AGENCY_PROMISE_IDS) {
    const row = raw.promises[id];
    if (!isRecord(row)) throw new AgenzieLedgerError(`promises.${id}: expected object`);
    if (typeof row.state !== 'string' || !PROMISE_STATUSES.includes(row.state as PromiseStatus)) {
      throw new AgenzieLedgerError(`promises.${id}.state: live|coming|hidden required`);
    }
    if (!Array.isArray(row.tasks) || row.tasks.length === 0) {
      throw new AgenzieLedgerError(`promises.${id}.tasks: non-empty string array required`);
    }
    for (const [i, task] of row.tasks.entries()) {
      if (typeof task !== 'string' || task.length === 0) {
        throw new AgenzieLedgerError(`promises.${id}.tasks[${i}]: non-empty string required`);
      }
    }
    if (row.note !== undefined && typeof row.note !== 'string') {
      throw new AgenzieLedgerError(`promises.${id}.note: string required when present`);
    }
    promises[id] = {
      state: row.state as PromiseStatus,
      tasks: row.tasks as string[],
      note: typeof row.note === 'string' ? row.note : undefined,
    };
  }

  return {
    version: raw.version,
    updatedAt: raw.updatedAt,
    $schema: typeof raw.$schema === 'string' ? raw.$schema : undefined,
    promises,
  };
}

let cached: AgenzieLedger | null = null;

export function getAgenzieLedger(): AgenzieLedger {
  if (!cached) cached = validateAgenzieLedger(rawLedger);
  return cached;
}

export function agencyPromiseEntries(
  ledger: AgenzieLedger = getAgenzieLedger(),
): AgencyPromiseEntry[] {
  return AGENCY_PROMISE_IDS.map((id) => {
    const p = ledger.promises[id];
    return { id, status: p.state, tasks: p.tasks, note: p.note };
  });
}

export function visibleAgencyPromises(
  ledger: AgenzieLedger = getAgenzieLedger(),
): AgencyPromiseEntry[] {
  return agencyPromiseEntries(ledger).filter((e) => e.status !== 'hidden');
}

export function agenziePath(locale: string): string {
  if (locale === 'en') return LOCALIZED_PATHS.en;
  if (locale === 'es') return LOCALIZED_PATHS.es;
  return LOCALIZED_PATHS.it;
}

export function agenzieAbsoluteUrl(locale: string, site = 'https://easycasaita.com'): string {
  return `${site}/${locale}${agenziePath(locale)}`;
}

export function agenzieLanguageAlternates(
  site = 'https://easycasaita.com',
): Record<string, string> {
  return {
    it: agenzieAbsoluteUrl('it', site),
    en: agenzieAbsoluteUrl('en', site),
    es: agenzieAbsoluteUrl('es', site),
    'x-default': agenzieAbsoluteUrl('it', site),
  };
}
