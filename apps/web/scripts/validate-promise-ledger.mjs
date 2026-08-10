/**
 * Build-time / Node ESM validator for promises.json (EC-S-T03).
 * Keep rules in sync with `src/lib/promiseLedger/index.ts`.
 */

const PROMISE_STATUSES = new Set(['live', 'coming', 'hidden']);
const BLOCK_STATES = new Set(['live', 'fallback', 'hidden']);
const REQUIRED_BENEFITS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
const REQUIRED_STEPS = ['list', 'price', 'verify', 'buyers', 'viewings'];

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
  if (!isRecord(raw.blocks)) throw new LedgerValidationError('blocks: object required');
  if (!BLOCK_STATES.has(raw.blocks.savingsFigures)) {
    throw new LedgerValidationError('blocks.savingsFigures: invalid state');
  }
  if (!BLOCK_STATES.has(raw.blocks.mediazioneCopy)) {
    throw new LedgerValidationError('blocks.mediazioneCopy: invalid state');
  }
  if (!Array.isArray(raw.benefits) || !Array.isArray(raw.steps)) {
    throw new LedgerValidationError('benefits/steps: arrays required');
  }

  for (const [i, b] of raw.benefits.entries()) {
    if (!isRecord(b) || typeof b.id !== 'string' || !PROMISE_STATUSES.has(b.status)) {
      throw new LedgerValidationError(`benefits[${i}]: invalid entry`);
    }
  }
  for (const [i, s] of raw.steps.entries()) {
    if (!isRecord(s) || typeof s.id !== 'string' || !PROMISE_STATUSES.has(s.status)) {
      throw new LedgerValidationError(`steps[${i}]: invalid entry`);
    }
  }

  const benefitIds = new Set(raw.benefits.map((b) => b.id));
  for (const id of REQUIRED_BENEFITS) {
    if (!benefitIds.has(id)) throw new LedgerValidationError(`benefits: missing ${id}`);
  }
  const stepIds = new Set(raw.steps.map((s) => s.id));
  for (const id of REQUIRED_STEPS) {
    if (!stepIds.has(id)) throw new LedgerValidationError(`steps: missing ${id}`);
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

  return raw;
}
