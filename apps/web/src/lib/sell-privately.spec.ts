import { describe, expect, it } from 'vitest';
import {
  estimateAgencySavingEur,
  getSellPrivatelyBenefits,
  getSellPrivatelyLedger,
  getSellPrivatelySteps,
  sellPrivatelyAbsoluteUrl,
  sellPrivatelyLanguageAlternates,
  sellPrivatelyOgLocale,
  sellPrivatelyPath,
  showBuyerPreapprovalComing,
  showEnergyRequiredLive,
  showMediazioneFallback,
  showSavingsFallback,
  showSavingsFigures,
  visiblePromiseEntries,
} from './sell-privately';

describe('sell-privately ledger', () => {
  it('loads nested promises and six how-it-works steps', () => {
    const ledger = getSellPrivatelyLedger();
    expect(Object.keys(ledger.promises)).toHaveLength(12);
    expect(getSellPrivatelyBenefits(ledger).map((b) => b.id)).toEqual([
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
    expect(getSellPrivatelySteps(ledger).map((s) => s.id)).toEqual([
      'price',
      'docs',
      'verify',
      'list',
      'meet',
      'viewings',
    ]);
    expect(getSellPrivatelySteps(ledger).map((s) => s.status)).toEqual([
      'live',
      'live',
      'live',
      'coming',
      'you',
      'live',
    ]);
    expect(getSellPrivatelyBenefits(ledger).some((b) => b.id === 'P4')).toBe(false);
    expect(getSellPrivatelySteps(ledger).some((s) => s.id === 'buyers')).toBe(false);
  });

  it('EC-SELL-PRIVATELY-1: retract P4, keep P3 live, promote P5, add P9–P12', () => {
    const { promises, blocks } = getSellPrivatelyLedger();
    expect(promises.P4.state).toBe('retracted');
    expect(promises.P3.state).toBe('live');
    expect(promises.P5.state).toBe('live');
    expect(promises.P9.state).toBe('live');
    expect(promises.P10.state).toBe('live');
    expect(promises.P10.licence_state).toEqual(['ponte']);
    expect(promises.P11.state).toBe('live');
    expect(promises.P12.state).toBe('coming');
    expect(blocks.savingsFigures.state).toBe('retracted');
    expect(blocks.mediazioneCopy.state).toBe('retracted');
    expect(showSavingsFigures()).toBe(false);
    expect(showSavingsFallback()).toBe(false);
    expect(showMediazioneFallback()).toBe(false);
    expect(showEnergyRequiredLive()).toBe(true);
    expect(showBuyerPreapprovalComing()).toBe(true);
  });

  it('omits hidden and retracted entries from visible lists', () => {
    expect(
      visiblePromiseEntries([
        { id: 'a', status: 'live', tasks: [] },
        { id: 'b', status: 'coming', tasks: [] },
        { id: 'c', status: 'hidden', tasks: [] },
        { id: 'd', status: 'retracted', tasks: [] },
      ]).map((e) => e.id),
    ).toEqual(['a', 'b']);
  });

  it('localizes public paths, OG locale, and alternates incl. x-default (T33)', () => {
    expect(sellPrivatelyPath('it')).toBe('/vendi-da-privato');
    expect(sellPrivatelyPath('en')).toBe('/sell-privately');
    expect(sellPrivatelyPath('es')).toBe('/vender-entre-particulares');
    expect(sellPrivatelyAbsoluteUrl('en')).toBe('https://easycasaita.com/en/sell-privately');
    expect(sellPrivatelyOgLocale('en')).toBe('en');
    expect(sellPrivatelyOgLocale('it')).toBe('it_IT');
    expect(sellPrivatelyOgLocale('es')).toBe('es_ES');
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
