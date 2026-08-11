import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import itMessages from '../../messages/it.json';

const LOCALES = {
  it: itMessages as AbstractIntlMessages,
  en: enMessages as AbstractIntlMessages,
  es: esMessages as AbstractIntlMessages,
} as const;

const KEYS = [
  'verifiedOwner',
  'verifiedOwnerAria',
  'docsScore',
  'docsScoreAria',
  'listedByOwner',
  'daysOnMarket',
] as const;

describe('trustChips i18n (EC-S soft-launch PR-B)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: all trustChips keys present`, () => {
      const t = createTranslator({ locale, messages, namespace: 'trustChips' });
      for (const key of KEYS) {
        expect(t.has(key)).toBe(true);
      }
    });
  }

  it('ICU plurals: 0 / 1 / n days across locales', () => {
    const cases: Array<{ locale: keyof typeof LOCALES; zero: string; one: string; many: string }> = [
      {
        locale: 'it',
        zero: 'In vendita da oggi',
        one: 'In vendita da 1 giorno',
        many: 'In vendita da 9 giorni',
      },
      {
        locale: 'en',
        zero: 'On the market since today',
        one: 'On the market for 1 day',
        many: 'On the market for 9 days',
      },
      {
        locale: 'es',
        zero: 'En venta desde hoy',
        one: 'En venta desde hace 1 día',
        many: 'En venta desde hace 9 días',
      },
    ];
    for (const c of cases) {
      const t = createTranslator({
        locale: c.locale,
        messages: LOCALES[c.locale],
        namespace: 'trustChips',
      });
      expect(t('daysOnMarket', { days: 0 })).toBe(c.zero);
      expect(t('daysOnMarket', { days: 1 })).toBe(c.one);
      expect(t('daysOnMarket', { days: 9 })).toBe(c.many);
    }
  });

  it('docsScore interpolates have/total', () => {
    const t = createTranslator({
      locale: 'it',
      messages: LOCALES.it,
      namespace: 'trustChips',
    });
    expect(t('docsScore', { have: 2, total: 5 })).toBe('Documentazione 2/5');
  });
});
