import { describe, expect, it } from 'vitest';
import {
  LedgerValidationError,
  promiseEntries,
  validateLedger,
  visiblePromiseEntries,
  type PromiseLedger,
} from './index';
import rawLedger from '../../config/sell-privately/promises.json';

const validBase: PromiseLedger = {
  version: 1,
  updatedAt: '2026-08-10',
  promises: {
    P1: { state: 'live', tasks: ['T01'] },
    P2: { state: 'coming', tasks: ['T08', 'T09'] },
    P3: { state: 'coming', tasks: ['T14'] },
    P4: { state: 'live', tasks: ['EC-1'] },
    P5: { state: 'live', tasks: ['EC-3'] },
    P6: { state: 'coming', tasks: ['T18'] },
    P7: { state: 'coming', tasks: ['T23'] },
    P8: { state: 'live', tasks: ['T05', 'T06'] },
  },
  blocks: {
    savingsFigures: { state: 'fallback', gate: 'T02' },
    mediazioneCopy: { state: 'fallback', gate: 'T04' },
  },
};

describe('promiseLedger.validateLedger', () => {
  it('accepts the shipped promises.json', () => {
    const ledger = validateLedger(rawLedger);
    expect(ledger.blocks.savingsFigures.state).toBe('fallback');
    expect(ledger.blocks.mediazioneCopy.state).toBe('fallback');
    expect(ledger.blocks.savingsFigures.gate).toBe('T02');
    expect(ledger.blocks.mediazioneCopy.gate).toBe('T04');
    expect(promiseEntries(ledger)).toHaveLength(8);
  });

  it('T02/T04 interim: rejects live counsel blocks', () => {
    expect(() =>
      validateLedger({
        ...validBase,
        blocks: {
          ...validBase.blocks,
          savingsFigures: { state: 'live', gate: 'T02' },
        },
      }),
    ).toThrow(LedgerValidationError);

    expect(() =>
      validateLedger({
        ...validBase,
        blocks: {
          ...validBase.blocks,
          mediazioneCopy: { state: 'live', gate: 'T04' },
        },
      }),
    ).toThrow(/mediazioneCopy/);
  });

  it('allows live counsel blocks only when interim enforcement is off', () => {
    const ledger = validateLedger(
      {
        ...validBase,
        blocks: {
          savingsFigures: { state: 'live', gate: 'T02' },
          mediazioneCopy: { state: 'live', gate: 'T04' },
        },
      },
      { enforceCounselInterim: false },
    );
    expect(ledger.blocks.savingsFigures.state).toBe('live');
  });

  it('rejects malformed state, wrong gate, and missing required ids', () => {
    expect(() =>
      validateLedger({
        ...validBase,
        promises: {
          ...validBase.promises,
          P1: { ...validBase.promises.P1, state: 'available' as 'live' },
        },
      }),
    ).toThrow(/state/);

    expect(() =>
      validateLedger({
        ...validBase,
        promises: Object.fromEntries(
          Object.entries(validBase.promises).filter(([id]) => id !== 'P8'),
        ),
      }),
    ).toThrow(/P8/);

    expect(() =>
      validateLedger({
        ...validBase,
        blocks: {
          ...validBase.blocks,
          savingsFigures: { state: 'fallback', gate: 'T99' },
        },
      }),
    ).toThrow(/gate/);
  });

  it('omits hidden entries', () => {
    expect(
      visiblePromiseEntries([
        { id: 'a', status: 'live', tasks: [] },
        { id: 'b', status: 'hidden', tasks: [] },
      ]).map((e) => e.id),
    ).toEqual(['a']);
  });
});
