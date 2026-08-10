import { describe, expect, it } from 'vitest';
import {
  estimateAgencySavingEur,
  getSellPrivatelyLedger,
  sellPrivatelyAbsoluteUrl,
  sellPrivatelyLanguageAlternates,
  sellPrivatelyPath,
  showMediazioneFallback,
  showSavingsFallback,
  showSavingsFigures,
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

  it('keeps counsel blocks on fallback until T02/T04 sign-off (interim rule)', () => {
    const { blocks } = getSellPrivatelyLedger();
    expect(blocks.savingsFigures).toBe('fallback');
    expect(blocks.mediazioneCopy).toBe('fallback');
    expect(showSavingsFigures()).toBe(false);
    expect(showSavingsFallback()).toBe(true);
    expect(showMediazioneFallback()).toBe(true);
  });

  it('Phase 0 exit: P1/P4/P5/P8 live; P2/P3/P6/P7 coming', () => {
    const byId = Object.fromEntries(
      getSellPrivatelyLedger().benefits.map((b) => [b.id, b.status]),
    );
    expect(byId.P1).toBe('live');
    expect(byId.P4).toBe('live');
    expect(byId.P5).toBe('live');
    expect(byId.P8).toBe('live');
    expect(byId.P2).toBe('coming');
    expect(byId.P3).toBe('coming');
    expect(byId.P6).toBe('coming');
    expect(byId.P7).toBe('coming');
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

  it('localizes public paths and absolute alternates incl. x-default (T33)', () => {
    expect(sellPrivatelyPath('it')).toBe('/vendi-da-privato');
    expect(sellPrivatelyPath('en')).toBe('/sell-privately');
    expect(sellPrivatelyPath('es')).toBe('/vender-entre-particulares');
    expect(sellPrivatelyAbsoluteUrl('en')).toBe('https://easycasaita.com/en/sell-privately');
    expect(sellPrivatelyLanguageAlternates()).toEqual({
      it: 'https://easycasaita.com/it/vendi-da-privato',
      en: 'https://easycasaita.com/en/sell-privately',
      es: 'https://easycasaita.com/es/vender-entre-particulares',
      'x-default': 'https://easycasaita.com/it/vendi-da-privato',
    });
  });

  it('estimates customary 3% and 3%+IVA savings on €250k (gated helper only)', () => {
    expect(estimateAgencySavingEur(250_000)).toEqual({ net: 7_500, withIva: 9_150 });
  });
});
