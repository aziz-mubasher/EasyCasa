import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { NUDGE_CODES } from '@easycasa/shared';

import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import itMessages from '../../messages/it.json';

const LOCALES = {
  it: itMessages as unknown as AbstractIntlMessages,
  en: enMessages as unknown as AbstractIntlMessages,
  es: esMessages as unknown as AbstractIntlMessages,
} as const;

const FORBIDDEN =
  /ti consigliamo|dovresti|prezzo giusto|prezzo consigliato|considera di|we recommend|you should|consider (lowering|raising|reducing)|deberías|te recomendamos/i;

describe('nudges i18n (EC-S-T24)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: all nudge codes + chrome keys present`, () => {
      const t = createTranslator({ locale, messages, namespace: 'nudges' });
      for (const code of NUDGE_CODES) {
        expect(t.has(code)).toBe(true);
        expect(t(code).length).toBeGreaterThan(8);
      }
      expect(t.has('title')).toBe(true);
      expect(t.has('dismiss')).toBe(true);
    });

    it(`${locale}: observation-only (no advice / CTA tokens)`, () => {
      const t = createTranslator({ locale, messages, namespace: 'nudges' });
      for (const code of NUDGE_CODES) {
        expect(t(code)).not.toMatch(FORBIDDEN);
      }
    });
  }

  it('IT is master: EN/ES cover the same code keys', () => {
    for (const code of NUDGE_CODES) {
      expect(itMessages.nudges).toHaveProperty(code);
      expect(enMessages.nudges).toHaveProperty(code);
      expect(esMessages.nudges).toHaveProperty(code);
    }
  });
});
