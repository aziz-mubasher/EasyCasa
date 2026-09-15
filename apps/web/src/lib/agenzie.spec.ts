import { describe, expect, it } from 'vitest';
import rawLedger from '../config/agenzie/promises.json';
import {
  AGENCY_PROMISE_IDS,
  AgenzieLedgerError,
  agencyPromiseEntries,
  agenzieAbsoluteUrl,
  agenzieLanguageAlternates,
  agenziePath,
  getAgenzieLedger,
  validateAgenzieLedger,
  visibleAgencyPromises,
} from './agenzie';

describe('agenzie ledger + paths', () => {
  it('validates the shipped ledger with A1–A4 coming', () => {
    const ledger = validateAgenzieLedger(rawLedger);
    expect(ledger.promises.A1.state).toBe('coming');
    expect(ledger.promises.A2.state).toBe('coming');
    expect(ledger.promises.A3.state).toBe('coming');
    expect(ledger.promises.A4.state).toBe('coming');
    expect(agencyPromiseEntries(ledger).map((e) => e.id)).toEqual([...AGENCY_PROMISE_IDS]);
    expect(visibleAgencyPromises(ledger)).toHaveLength(4);
    expect(getAgenzieLedger().updatedAt).toBe('2026-09-15');
  });

  it('rejects a missing promise id', () => {
    expect(() =>
      validateAgenzieLedger({
        version: 1,
        updatedAt: '2026-09-15',
        promises: {
          A1: { state: 'coming', tasks: ['T14'] },
          A2: { state: 'coming', tasks: ['X'] },
          A3: { state: 'coming', tasks: ['T19.2'] },
        },
      }),
    ).toThrow(AgenzieLedgerError);
  });

  it('localizes the English slug and keeps Italian/Spanish on /agenzie', () => {
    expect(agenziePath('it')).toBe('/agenzie');
    expect(agenziePath('en')).toBe('/for-agencies');
    expect(agenziePath('es')).toBe('/agenzie');
    expect(agenzieAbsoluteUrl('en')).toBe('https://easycasaita.com/en/for-agencies');
    expect(agenzieLanguageAlternates()).toEqual({
      it: 'https://easycasaita.com/it/agenzie',
      en: 'https://easycasaita.com/en/for-agencies',
      es: 'https://easycasaita.com/es/agenzie',
      'x-default': 'https://easycasaita.com/it/agenzie',
    });
  });
});
