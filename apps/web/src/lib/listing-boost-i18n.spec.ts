import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import itMessages from '../../messages/it.json';
import { parseListingDetail } from './listing-detail';

const LOCALES = {
  // JSON message trees include arrays; cast via unknown for next-intl's index type.
  it: itMessages as unknown as AbstractIntlMessages,
  en: enMessages as unknown as AbstractIntlMessages,
  es: esMessages as unknown as AbstractIntlMessages,
} as const;

// EC-S-T26 — commercial label (DSA / Codice del Consumo). NOT under trustChips.
const KEYS = ['inEvidenza', 'inEvidenzaAria', 'directoryNote'] as const;

describe('listingBoost i18n label contract (EC-S-T26)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: all listingBoost keys present`, () => {
      const t = createTranslator({ locale, messages, namespace: 'listingBoost' });
      for (const key of KEYS) {
        expect(t.has(key)).toBe(true);
      }
    });

    it(`${locale}: label is not defined under trustChips (commercial, not trust)`, () => {
      const trust = createTranslator({ locale, messages, namespace: 'trustChips' });
      expect(trust.has('inEvidenza')).toBe(false);
    });
  }

  it('it: label reads "In evidenza"', () => {
    const t = createTranslator({ locale: 'it', messages: LOCALES.it, namespace: 'listingBoost' });
    expect(t('inEvidenza')).toBe('In evidenza');
  });

  it('parseListingDetail exposes boosted type field outside trust', () => {
    expect(parseListingDetail({ boosted: true }, 'slug').boosted).toBe(true);
    expect(parseListingDetail({ boosted: false }, 'slug').boosted).toBe(false);
    expect(parseListingDetail({}, 'slug').boosted).toBe(false);
  });
});
