import { describe, expect, it } from 'vitest';
import {
  estimateAgencySavingEur,
  getSellPrivatelyLedger,
  sellPrivatelyAbsoluteUrl,
  sellPrivatelyPath,
  visiblePromiseEntries,
} from './sell-privately';

describe('sell-privately ledger', () => {
  it('loads benefits and steps with only live|coming|hidden statuses', () => {
    const ledger = getSellPrivatelyLedger();
    expect(ledger.benefits.length).toBe(8);
    expect(ledger.steps.length).toBe(5);
    for (const entry of [...ledger.benefits, ...ledger.steps]) {
      expect(['live', 'coming', 'hidden']).toContain(entry.status);
    }
  });

  it('omits hidden entries from visible lists', () => {
    expect(
      visiblePromiseEntries([
        { id: 'a', status: 'live', roadmap: null },
        { id: 'b', status: 'coming', roadmap: null },
        { id: 'c', status: 'hidden', roadmap: null },
      ]).map((e) => e.id),
    ).toEqual(['a', 'b']);
  });

  it('localizes public paths', () => {
    expect(sellPrivatelyPath('it')).toBe('/vendi-da-privato');
    expect(sellPrivatelyPath('en')).toBe('/sell-privately');
    expect(sellPrivatelyPath('es')).toBe('/vender-como-particular');
    expect(sellPrivatelyAbsoluteUrl('en')).toBe('https://easycasaita.com/en/sell-privately');
  });

  it('estimates customary 3% and 3%+IVA savings on €250k', () => {
    expect(estimateAgencySavingEur(250_000)).toEqual({ net: 7_500, withIva: 9_150 });
  });
});
