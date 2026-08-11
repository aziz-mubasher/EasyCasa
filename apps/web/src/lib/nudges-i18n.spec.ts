import { describe, expect, it } from 'vitest';
import { createTranslator } from 'next-intl';
import { NUDGE_CODES } from '@easycasa/shared';

import en from '../../messages/en.json';
import es from '../../messages/es.json';
import it from '../../messages/it.json';

const LOCALES = [
  { locale: 'it', messages: it },
  { locale: 'en', messages: en },
  { locale: 'es', messages: es },
] as const;

const FORBIDDEN =
  /ti consigliamo|dovresti|prezzo giusto|prezzo consigliato|considera di|we recommend|you should|consider (lowering|raising|reducing)|deberías|te recomendamos/i;

describe('nudges i18n (EC-S-T24)', () => {
  for (const { locale, messages } of LOCALES) {
    it(`${locale}: all nudge codes + chrome keys present`, () => {
      const t = createTranslator({ locale, messages, namespace: 'nudges' });
      for (const code of NUDGE_CODES) {
        expect(t(code).length).toBeGreaterThan(8);
      }
      expect(t('title').length).toBeGreaterThan(3);
      expect(t('dismiss').length).toBeGreaterThan(2);
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
      expect(it.nudges).toHaveProperty(code);
      expect(en.nudges).toHaveProperty(code);
      expect(es.nudges).toHaveProperty(code);
    }
  });
});
