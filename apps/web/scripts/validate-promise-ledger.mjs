/**
 * Build-time / Node ESM validator for promises.json (EC-S-T03).
 * Keep rules in sync with `src/lib/promiseLedger/index.ts`.
 */

const PROMISE_STATUSES = new Set(['live', 'coming', 'hidden', 'retracted']);
const LICENCE_STATES = new Set(['ponte', 'agente', 'oam']);
const BLOCK_STATES = new Set(['live', 'fallback', 'hidden', 'retracted']);
const REQUIRED_PROMISES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12'];
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
  if (!LICENCE_STATES.has(raw.companyLicenceState)) {
    throw new LedgerValidationError('companyLicenceState: ponte|agente|oam required');
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
    if (
      !Array.isArray(p.licence_state) ||
      p.licence_state.length === 0 ||
      p.licence_state.some((s) => !LICENCE_STATES.has(s))
    ) {
      throw new LedgerValidationError(`promises.${id}.licence_state: non-empty ponte|agente|oam[] required`);
    }
    if (id === 'P4' && p.state === 'retracted' && typeof p.retractedReason !== 'string') {
      throw new LedgerValidationError('promises.P4.retractedReason: required when retracted');
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

  void enforceCounselInterim;

  return raw;
}
