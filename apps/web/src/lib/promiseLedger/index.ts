/**
 * Promise ledger — honesty mechanic for Sell Privately (EC-S-T03).
 * Statuses drive UI chips; counsel block states gate legal-adjacent copy.
 */

export type PromiseStatus = 'live' | 'coming' | 'hidden';

/** Counsel-gated page blocks (T02 / T04). */
export type BlockState = 'live' | 'fallback' | 'hidden';

export type PromiseEntry = {
  id: string;
  status: PromiseStatus;
  roadmap: string | null;
};

export type CounselBlocks = {
  /** € savings figures + AGCM footnote + slider. */
  savingsFigures: BlockState;
  /** “What EasyCasa is not” / mediazione boundary copy. */
  mediazioneCopy: BlockState;
};

export type PromiseLedger = {
  version: number;
  updatedAt: string;
  notes?: string;
  blocks: CounselBlocks;
  benefits: PromiseEntry[];
  steps: PromiseEntry[];
};

const PROMISE_STATUSES: readonly PromiseStatus[] = ['live', 'coming', 'hidden'];
const BLOCK_STATES: readonly BlockState[] = ['live', 'fallback', 'hidden'];
const REQUIRED_BENEFIT_IDS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'] as const;
const REQUIRED_STEP_IDS = ['list', 'price', 'verify', 'buyers', 'viewings'] as const;

export class LedgerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertStatus(value: unknown, path: string): asserts value is PromiseStatus {
  if (typeof value !== 'string' || !PROMISE_STATUSES.includes(value as PromiseStatus)) {
    throw new LedgerValidationError(`${path}: status must be one of ${PROMISE_STATUSES.join('|')}`);
  }
}

function assertBlockState(value: unknown, path: string): asserts value is BlockState {
  if (typeof value !== 'string' || !BLOCK_STATES.includes(value as BlockState)) {
    throw new LedgerValidationError(`${path}: must be one of ${BLOCK_STATES.join('|')}`);
  }
}

function parseEntry(raw: unknown, path: string): PromiseEntry {
  if (!isRecord(raw)) throw new LedgerValidationError(`${path}: expected object`);
  if (typeof raw.id !== 'string' || raw.id.length === 0) {
    throw new LedgerValidationError(`${path}.id: non-empty string required`);
  }
  assertStatus(raw.status, `${path}.status`);
  if (raw.roadmap !== null && typeof raw.roadmap !== 'string') {
    throw new LedgerValidationError(`${path}.roadmap: string | null required`);
  }
  return {
    id: raw.id,
    status: raw.status,
    roadmap: raw.roadmap === undefined ? null : (raw.roadmap as string | null),
  };
}

/**
 * Validate a ledger document. Throws {@link LedgerValidationError} on failure.
 * Enforces T02/T04 interim: savingsFigures and mediazioneCopy must not be `live`
 * until counsel flips them (CI guard — do not weaken).
 */
export function validateLedger(raw: unknown, opts?: { enforceCounselInterim?: boolean }): PromiseLedger {
  const enforceCounselInterim = opts?.enforceCounselInterim ?? true;
  if (!isRecord(raw)) throw new LedgerValidationError('ledger: expected object');
  if (typeof raw.version !== 'number' || !Number.isFinite(raw.version)) {
    throw new LedgerValidationError('version: finite number required');
  }
  if (typeof raw.updatedAt !== 'string' || raw.updatedAt.length === 0) {
    throw new LedgerValidationError('updatedAt: non-empty string required');
  }
  if (!isRecord(raw.blocks)) throw new LedgerValidationError('blocks: object required');
  assertBlockState(raw.blocks.savingsFigures, 'blocks.savingsFigures');
  assertBlockState(raw.blocks.mediazioneCopy, 'blocks.mediazioneCopy');

  if (!Array.isArray(raw.benefits)) throw new LedgerValidationError('benefits: array required');
  if (!Array.isArray(raw.steps)) throw new LedgerValidationError('steps: array required');

  const benefits = raw.benefits.map((b, i) => parseEntry(b, `benefits[${i}]`));
  const steps = raw.steps.map((s, i) => parseEntry(s, `steps[${i}]`));

  const benefitIds = new Set(benefits.map((b) => b.id));
  for (const id of REQUIRED_BENEFIT_IDS) {
    if (!benefitIds.has(id)) throw new LedgerValidationError(`benefits: missing required id ${id}`);
  }
  const stepIds = new Set(steps.map((s) => s.id));
  for (const id of REQUIRED_STEP_IDS) {
    if (!stepIds.has(id)) throw new LedgerValidationError(`steps: missing required id ${id}`);
  }

  if (enforceCounselInterim) {
    if (raw.blocks.savingsFigures === 'live') {
      throw new LedgerValidationError(
        'blocks.savingsFigures must not be live until T02 counsel sign-off (interim rule)',
      );
    }
    if (raw.blocks.mediazioneCopy === 'live') {
      throw new LedgerValidationError(
        'blocks.mediazioneCopy must not be live until T04 counsel sign-off (interim rule)',
      );
    }
  }

  return {
    version: raw.version,
    updatedAt: raw.updatedAt,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    blocks: {
      savingsFigures: raw.blocks.savingsFigures,
      mediazioneCopy: raw.blocks.mediazioneCopy,
    },
    benefits,
    steps,
  };
}

export function visiblePromiseEntries(entries: PromiseEntry[]): PromiseEntry[] {
  return entries.filter((e) => e.status !== 'hidden');
}

export function isBlockLive(state: BlockState): boolean {
  return state === 'live';
}

export function isBlockFallback(state: BlockState): boolean {
  return state === 'fallback';
}

export function isBlockHidden(state: BlockState): boolean {
  return state === 'hidden';
}
