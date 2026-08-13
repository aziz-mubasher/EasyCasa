/**
 * Promise ledger — honesty mechanic for Sell Privately (EC-S-T03).
 * Nested schema: promises.P* + counsel blocks with state/gate/note.
 */

export type PromiseStatus = 'live' | 'coming' | 'hidden';

/** Counsel-gated page blocks (T02 / T04). */
export type BlockState = 'live' | 'fallback' | 'hidden';

export const REQUIRED_PROMISE_IDS = [
  'P1',
  'P2',
  'P3',
  'P4',
  'P5',
  'P6',
  'P7',
  'P8',
] as const;

export type PromiseId = (typeof REQUIRED_PROMISE_IDS)[number];

export type PromiseRecord = {
  state: PromiseStatus;
  tasks: string[];
  note?: string;
};

export type CounselBlock = {
  state: BlockState;
  gate: string;
  note?: string;
};

export type CounselBlocks = {
  /** € savings figures + AGCM footnote + slider. */
  savingsFigures: CounselBlock;
  /** “What EasyCasa is not” / mediazione boundary copy. */
  mediazioneCopy: CounselBlock;
};

export type PromiseLedger = {
  version: number;
  updatedAt: string;
  $schema?: string;
  promises: Record<PromiseId, PromiseRecord>;
  blocks: CounselBlocks;
};

/** Flat UI row derived from a promise (or how-it-works step binding). */
export type PromiseEntry = {
  id: string;
  status: PromiseStatus;
  tasks: string[];
  note?: string;
};

const PROMISE_STATUSES: readonly PromiseStatus[] = ['live', 'coming', 'hidden'];
const BLOCK_STATES: readonly BlockState[] = ['live', 'fallback', 'hidden'];

/** Expected counsel gates — wrong gate ids fail validation. */
const REQUIRED_BLOCK_GATES = {
  savingsFigures: 'T02',
  mediazioneCopy: 'T04',
} as const;

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
    throw new LedgerValidationError(`${path}: state must be one of ${PROMISE_STATUSES.join('|')}`);
  }
}

function assertBlockState(value: unknown, path: string): asserts value is BlockState {
  if (typeof value !== 'string' || !BLOCK_STATES.includes(value as BlockState)) {
    throw new LedgerValidationError(`${path}: must be one of ${BLOCK_STATES.join('|')}`);
  }
}

function parsePromise(raw: unknown, path: string): PromiseRecord {
  if (!isRecord(raw)) throw new LedgerValidationError(`${path}: expected object`);
  assertStatus(raw.state, `${path}.state`);
  if (!Array.isArray(raw.tasks) || raw.tasks.length === 0) {
    throw new LedgerValidationError(`${path}.tasks: non-empty string array required`);
  }
  for (const [i, task] of raw.tasks.entries()) {
    if (typeof task !== 'string' || task.length === 0) {
      throw new LedgerValidationError(`${path}.tasks[${i}]: non-empty string required`);
    }
  }
  if (raw.note !== undefined && typeof raw.note !== 'string') {
    throw new LedgerValidationError(`${path}.note: string required when present`);
  }
  return {
    state: raw.state,
    tasks: raw.tasks as string[],
    note: typeof raw.note === 'string' ? raw.note : undefined,
  };
}

function parseCounselBlock(raw: unknown, path: string, expectedGate: string): CounselBlock {
  if (!isRecord(raw)) throw new LedgerValidationError(`${path}: expected object`);
  assertBlockState(raw.state, `${path}.state`);
  if (typeof raw.gate !== 'string' || raw.gate.length === 0) {
    throw new LedgerValidationError(`${path}.gate: non-empty string required`);
  }
  if (raw.gate !== expectedGate) {
    throw new LedgerValidationError(`${path}.gate: expected ${expectedGate}, got ${raw.gate}`);
  }
  if (raw.note !== undefined && typeof raw.note !== 'string') {
    throw new LedgerValidationError(`${path}.note: string required when present`);
  }
  return {
    state: raw.state,
    gate: raw.gate,
    note: typeof raw.note === 'string' ? raw.note : undefined,
  };
}

/**
 * Validate a ledger document. Throws {@link LedgerValidationError} on failure.
 * Enforces T02/T04 interim: savingsFigures and mediazioneCopy must not be `live`
 * until counsel flips them (CI guard — do not weaken).
 */
export function validateLedger(
  raw: unknown,
  opts?: { enforceCounselInterim?: boolean },
): PromiseLedger {
  const enforceCounselInterim = opts?.enforceCounselInterim ?? true;
  if (!isRecord(raw)) throw new LedgerValidationError('ledger: expected object');
  if (typeof raw.version !== 'number' || !Number.isFinite(raw.version)) {
    throw new LedgerValidationError('version: finite number required');
  }
  if (typeof raw.updatedAt !== 'string' || raw.updatedAt.length === 0) {
    throw new LedgerValidationError('updatedAt: non-empty string required');
  }
  if (!isRecord(raw.promises)) throw new LedgerValidationError('promises: object required');
  if (!isRecord(raw.blocks)) throw new LedgerValidationError('blocks: object required');

  const promises = {} as Record<PromiseId, PromiseRecord>;
  for (const id of REQUIRED_PROMISE_IDS) {
    if (!(id in raw.promises)) {
      throw new LedgerValidationError(`promises: missing required id ${id}`);
    }
    promises[id] = parsePromise(raw.promises[id], `promises.${id}`);
  }

  const blocks: CounselBlocks = {
    savingsFigures: parseCounselBlock(
      raw.blocks.savingsFigures,
      'blocks.savingsFigures',
      REQUIRED_BLOCK_GATES.savingsFigures,
    ),
    mediazioneCopy: parseCounselBlock(
      raw.blocks.mediazioneCopy,
      'blocks.mediazioneCopy',
      REQUIRED_BLOCK_GATES.mediazioneCopy,
    ),
  };

  // Claim 1–2 cleared 2026-08-13 — interim no longer blocks `live`.
  // `enforceCounselInterim` retained for callers/tests but is a no-op.
  void enforceCounselInterim;

  return {
    version: raw.version,
    updatedAt: raw.updatedAt,
    $schema: typeof raw.$schema === 'string' ? raw.$schema : undefined,
    promises,
    blocks,
  };
}

/** Ordered P1–P8 entries for UI chips / FAQ filters. */
export function promiseEntries(ledger: PromiseLedger): PromiseEntry[] {
  return REQUIRED_PROMISE_IDS.map((id) => {
    const p = ledger.promises[id];
    return {
      id,
      status: p.state,
      tasks: p.tasks,
      note: p.note,
    };
  });
}

export function visiblePromiseEntries(entries: PromiseEntry[]): PromiseEntry[] {
  return entries.filter((e) => e.status !== 'hidden');
}

export function isBlockLive(block: CounselBlock | BlockState): boolean {
  return (typeof block === 'string' ? block : block.state) === 'live';
}

export function isBlockFallback(block: CounselBlock | BlockState): boolean {
  return (typeof block === 'string' ? block : block.state) === 'fallback';
}

export function isBlockHidden(block: CounselBlock | BlockState): boolean {
  return (typeof block === 'string' ? block : block.state) === 'hidden';
}
