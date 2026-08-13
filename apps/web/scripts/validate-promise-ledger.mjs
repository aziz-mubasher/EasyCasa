/**
 * Build-time / Node ESM validator for promises.json (EC-S-T03).
 * Keep rules in sync with `src/lib/promiseLedger/index.ts`.
 */

const PROMISE_STATUSES = new Set(['live', 'coming', 'hidden']);
const BLOCK_STATES = new Set(['live', 'fallback', 'hidden']);
const REQUIRED_PROMISES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
const REQUIRED_BLOCK_GATES = {
  savingsFigures: 'T02',
  mediazioneCopy: 'T04',
};

export class LedgerValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LedgerValidationError';
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} raw
 * @param {{ enforceCounselInterim?: boolean }} [opts]
 */
export function validateLedger(raw, opts = {}) {
  const enforceCounselInterim = opts.enforceCounselInterim ?? true;
  if (!isRecord(raw)) throw new LedgerValidationError('ledger: expected object');
  if (typeof raw.version !== 'number' || !Number.isFinite(raw.version)) {
    throw new LedgerValidationError('version: finite number required');
  }
  if (typeof raw.updatedAt !== 'string' || !raw.updatedAt) {
    throw new LedgerValidationError('updatedAt: non-empty string required');
  }
  if (!isRecord(raw.promises)) throw new LedgerValidationError('promises: object required');
  if (!isRecord(raw.blocks)) throw new LedgerValidationError('blocks: object required');

  for (const id of REQUIRED_PROMISES) {
    const p = raw.promises[id];
    if (!isRecord(p) || !PROMISE_STATUSES.has(p.state)) {
      throw new LedgerValidationError(`promises.${id}: invalid entry`);
    }
    if (!Array.isArray(p.tasks) || p.tasks.length === 0 || p.tasks.some((t) => typeof t !== 'string' || !t)) {
      throw new LedgerValidationError(`promises.${id}.tasks: non-empty string array required`);
    }
  }

  for (const [key, expectedGate] of Object.entries(REQUIRED_BLOCK_GATES)) {
    const block = raw.blocks[key];
    if (!isRecord(block) || !BLOCK_STATES.has(block.state)) {
      throw new LedgerValidationError(`blocks.${key}.state: invalid`);
    }
    if (typeof block.gate !== 'string' || block.gate !== expectedGate) {
      throw new LedgerValidationError(`blocks.${key}.gate: expected ${expectedGate}`);
    }
  }

  // Claim 1–2 cleared 2026-08-13 — interim no longer blocks `live`.
  void enforceCounselInterim;

  return raw;
}
