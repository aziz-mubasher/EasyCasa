import { describe, expect, it } from 'vitest';
import {
  promiseEntries,
  validateLedger,
  visiblePromiseEntries,
  type PromiseLedger,
} from './index';
import rawLedger from '../../config/sell-privately/promises.json';

const validBase: PromiseLedger = {
  version: 2,
  updatedAt: '2026-09-15',
  companyLicenceState: 'ponte',
  promises: {
    P1: { state: 'retracted', tasks: ['T01'], licence_state: ['ponte'] },
    P2: { state: 'live', tasks: ['T08', 'T09'], licence_state: ['ponte', 'agente', 'oam'] },
    P3: { state: 'live', tasks: ['T14'], licence_state: ['ponte', 'agente', 'oam'] },
    P4: {
      state: 'retracted',
      tasks: ['EC-1'],
      licence_state: ['ponte'],
      retractedReason: 'not shippable',
    },
    P5: { state: 'live', tasks: ['EC-3'], licence_state: ['ponte', 'agente', 'oam'] },
    P6: { state: 'live', tasks: ['T18'], licence_state: ['ponte', 'agente', 'oam'] },
    P7: { state: 'live', tasks: ['T23'], licence_state: ['ponte', 'agente', 'oam'] },
    P8: { state: 'retracted', tasks: ['T05'], licence_state: ['ponte'] },
    P9: { state: 'live', tasks: ['X'], licence_state: ['ponte', 'agente', 'oam'] },
    P10: { state: 'live', tasks: ['X'], licence_state: ['ponte'] },
    P11: { state: 'live', tasks: ['R4'], licence_state: ['ponte', 'agente', 'oam'] },
    P12: { state: 'coming', tasks: ['PR-D'], licence_state: ['ponte', 'agente', 'oam'] },
  },
  blocks: {
    savingsFigures: { state: 'retracted', gate: 'T02' },
    mediazioneCopy: { state: 'retracted', gate: 'T04' },
  },
};

describe('promiseLedger.validateLedger', () => {
  it('accepts the shipped promises.json after EC-SELL-PRIVATELY-1', () => {
    const ledger = validateLedger(rawLedger);
    expect(ledger.companyLicenceState).toBe('ponte');
    expect(ledger.promises.P4.state).toBe('retracted');
    expect(ledger.promises.P4.retractedReason).toMatch(/Banks4All|OAM|GDPR/i);
    expect(ledger.promises.P9.state).toBe('live');
    expect(ledger.promises.P10.licence_state).toEqual(['ponte']);
    expect(ledger.promises.P11.state).toBe('live');
    expect(ledger.promises.P12.state).toBe('coming');
    expect(ledger.blocks.savingsFigures.state).toBe('retracted');
    expect(visiblePromiseEntries(promiseEntries(ledger), ledger).map((e) => e.id)).toEqual([
      'P2',
      'P3',
      'P5',
      'P6',
      'P7',
      'P9',
      'P10',
      'P11',
      'P12',
    ]);
  });

  it('rejects retracted P4 without a recorded reason', () => {
    expect(() =>
      validateLedger({
        ...validBase,
        promises: {
          ...validBase.promises,
          P4: { state: 'retracted', tasks: ['EC-1'], licence_state: ['ponte'] },
        },
      }),
    ).toThrow(/retractedReason/);
  });

  it('omits hidden and retracted entries', () => {
    expect(
      visiblePromiseEntries([
        { id: 'a', status: 'live', tasks: [] },
        { id: 'b', status: 'hidden', tasks: [] },
        { id: 'c', status: 'retracted', tasks: [] },
      ]).map((e) => e.id),
    ).toEqual(['a']);
  });

  it('hides live promises whose licence_state excludes the company state', () => {
    const ledger = validateLedger({
      ...validBase,
      promises: {
        ...validBase.promises,
        P10: { state: 'live', tasks: ['X'], licence_state: ['agente'] },
      },
    });
    expect(visiblePromiseEntries(promiseEntries(ledger), ledger).map((e) => e.id)).not.toContain('P10');
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
          Object.entries(validBase.promises).filter(([id]) => id !== 'P12'),
        ),
      }),
    ).toThrow(/P12/);

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
});
