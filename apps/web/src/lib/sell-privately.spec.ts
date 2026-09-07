import { describe, expect, it } from 'vitest';
import {
  estimateAgencySavingEur,
  getSellPrivatelyBenefits,
  getSellPrivatelyLedger,
  getSellPrivatelySteps,
  sellPrivatelyAbsoluteUrl,
  sellPrivatelyLanguageAlternates,
  sellPrivatelyPath,
  showMediazioneFallback,
  showSavingsFallback,
  showSavingsFigures,
  visiblePromiseEntries,
} from './sell-privately';

describe('sell-privately ledger', () => {
  it('loads nested promises and derived how-it-works steps', () => {
    const ledger = getSellPrivatelyLedger();
    expect(Object.keys(ledger.promises)).toHaveLength(8);
    expect(getSellPrivatelyBenefits(ledger).map((b) => b.id)).toEqual([
      'P2',
      'P3',
      'P4',
      'P5',
      'P6',
      'P7',
    ]);
    expect(getSellPrivatelySteps(ledger).map((s) => s.id)).toEqual([
      'list',
      'price',
      'verify',
      'buyers',
      'viewings',
    ]);
    for (const entry of [...getSellPrivatelyBenefits(ledger), ...getSellPrivatelySteps(ledger)]) {
      expect(['live', 'coming', 'hidden']).toContain(entry.status);
    }
  });

  it('EC-S-34: Claim 1–2 counsel blocks are hidden (register = retracted)', () => {
    const { blocks } = getSellPrivatelyLedger();
    expect(blocks.savingsFigures.state).toBe('hidden');
    expect(blocks.mediazioneCopy.state).toBe('hidden');
    expect(blocks.savingsFigures.gate).toBe('T02');
    expect(blocks.mediazioneCopy.gate).toBe('T04');
    expect(showSavingsFigures()).toBe(false);
    expect(showSavingsFallback()).toBe(false);
    expect(showMediazioneFallback()).toBe(false);
  });

  it('EC-S-34 honesty pass: retract P1/P8, scope P2/P3, P4 coming, P5–P7 live', () => {
    const byId = Object.fromEntries(
      Object.entries(getSellPrivatelyLedger().promises).map(([id, p]) => [id, p.state]),
    );
    expect(byId.P1).toBe('hidden');
    expect(byId.P2).toBe('live');
    expect(byId.P3).toBe('live');
    expect(byId.P4).toBe('coming');
    expect(byId.P5).toBe('live');
    expect(byId.P6).toBe('live');
    expect(byId.P7).toBe('live');
    expect(byId.P8).toBe('hidden');
  });

  it('omits hidden entries from visible lists', () => {
    expect(
      visiblePromiseEntries([
        { id: 'a', status: 'live', tasks: [] },
        { id: 'b', status: 'coming', tasks: [] },
        { id: 'c', status: 'hidden', tasks: [] },
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
