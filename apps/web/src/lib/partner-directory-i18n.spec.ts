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

describe('partnerDirectory i18n (T28 labelling)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: informational label present`, () => {
      const t = createTranslator({ locale, messages, namespace: 'partnerDirectory' });
      expect(t.has('informationalLabel')).toBe(true);
      expect(t('informationalLabel').length).toBeGreaterThan(10);
    });
  }

  it('IT master contains nessuna commissione', () => {
    expect(itMessages.partnerDirectory.informationalLabel).toMatch(/nessuna commissione/i);
  });
});
