import { describe, expect, it } from 'vitest';
import {
  LedgerValidationError,
  validateLedger,
  visiblePromiseEntries,
  type PromiseLedger,
} from './index';
import rawLedger from '../../config/sell-privately/promises.json';

const validBase: PromiseLedger = {
  version: 3,
  updatedAt: '2026-08-10',
  blocks: {
    savingsFigures: 'fallback',
    mediazioneCopy: 'fallback',
  },
  benefits: [
    { id: 'P1', status: 'live', roadmap: null },
    { id: 'P2', status: 'coming', roadmap: null },
    { id: 'P3', status: 'coming', roadmap: null },
    { id: 'P4', status: 'live', roadmap: null },
    { id: 'P5', status: 'live', roadmap: null },
    { id: 'P6', status: 'coming', roadmap: null },
    { id: 'P7', status: 'coming', roadmap: null },
    { id: 'P8', status: 'live', roadmap: null },
  ],
  steps: [
    { id: 'list', status: 'coming', roadmap: null },
    { id: 'price', status: 'coming', roadmap: null },
    { id: 'verify', status: 'coming', roadmap: null },
    { id: 'buyers', status: 'live', roadmap: null },
    { id: 'viewings', status: 'live', roadmap: null },
  ],
};

describe('promiseLedger.validateLedger', () => {
  it('accepts the shipped promises.json', () => {
    const ledger = validateLedger(rawLedger);
    expect(ledger.blocks.savingsFigures).toBe('fallback');
    expect(ledger.blocks.mediazioneCopy).toBe('fallback');
    expect(ledger.benefits).toHaveLength(8);
  });

  it('T02/T04 interim: rejects live counsel blocks', () => {
    expect(() =>
      validateLedger({
        ...validBase,
        blocks: { savingsFigures: 'live', mediazioneCopy: 'fallback' },
      }),
    ).toThrow(LedgerValidationError);

    expect(() =>
      validateLedger({
        ...validBase,
        blocks: { savingsFigures: 'fallback', mediazioneCopy: 'live' },
      }),
    ).toThrow(/mediazioneCopy/);
  });

  it('allows live counsel blocks only when interim enforcement is off', () => {
    const ledger = validateLedger(
      {
        ...validBase,
        blocks: { savingsFigures: 'live', mediazioneCopy: 'live' },
      },
      { enforceCounselInterim: false },
    );
    expect(ledger.blocks.savingsFigures).toBe('live');
  });

  it('rejects malformed status and missing required ids', () => {
    expect(() =>
      validateLedger({
        ...validBase,
        benefits: validBase.benefits.map((b) =>
          b.id === 'P1' ? { ...b, status: 'available' } : b,
        ),
      }),
    ).toThrow(/status/);

    expect(() =>
      validateLedger({
        ...validBase,
        benefits: validBase.benefits.filter((b) => b.id !== 'P8'),
      }),
    ).toThrow(/P8/);
  });

  it('omits hidden entries', () => {
    expect(
      visiblePromiseEntries([
        { id: 'a', status: 'live', roadmap: null },
        { id: 'b', status: 'hidden', roadmap: null },
      ]).map((e) => e.id),
    ).toEqual(['a']);
  });
});
