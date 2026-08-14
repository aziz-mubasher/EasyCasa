import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import itMessages from '../../messages/it.json';

const LOCALES = {
  it: itMessages as unknown as AbstractIntlMessages,
  en: enMessages as unknown as AbstractIntlMessages,
  es: esMessages as unknown as AbstractIntlMessages,
} as const;

const ROOT_KEYS = [
  'myListings.title',
  'boost.buy7d',
  'boost.buy30d',
  'boost.activeRemaining',
  'premium.title',
  'premium.subscribe',
  'premium.manage',
  'premium.upsellTitle',
  'billingReturn.successTitle',
] as const;

describe('sellerMonetisation i18n (PP-5 T04)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: sellerMonetisation keys present`, () => {
      const t = createTranslator({ locale, messages, namespace: 'sellerMonetisation' });
      for (const key of ROOT_KEYS) {
        expect(t.has(key)).toBe(true);
      }
    });

    it(`${locale}: no EUR amounts in monetisation copy`, () => {
      const block = JSON.stringify(messages.sellerMonetisation ?? {});
      expect(block).not.toMatch(/€\s?\d|EUR\s?\d|\d+[.,]\d{2}\s?€/i);
    });
  }

  it('IT boost buttons use approved In evidenza label pattern', () => {
    const t = createTranslator({ locale: 'it', messages: LOCALES.it, namespace: 'sellerMonetisation' });
    expect(t('boost.buy7d')).toContain('In evidenza');
  });
});
