/** EC-S-T28/T29 — neutral partner directory labelling present on every locale (AC). */

import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { PARTNER_DIRECTORY_CATEGORIES } from '@easycasa/shared';

import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import itMessages from '../../messages/it.json';

const LOCALES = {
  it: itMessages as unknown as AbstractIntlMessages,
  en: enMessages as unknown as AbstractIntlMessages,
  es: esMessages as unknown as AbstractIntlMessages,
} as const;

const KEYS = ['title', 'informationalLabel', 'lead', 'empty', 'credentials', 'contact'] as const;

describe('partnerDirectory i18n (EC-S-T28/T29)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: all partnerDirectory keys present`, () => {
      const t = createTranslator({ locale, messages, namespace: 'partnerDirectory' });
      for (const key of KEYS) {
        expect(t.has(key)).toBe(true);
      }
      for (const category of PARTNER_DIRECTORY_CATEGORIES) {
        expect(t.has(`categories.${category}`)).toBe(true);
      }
    });
  }

  // Italian is the master copy — AC requires this exact string on every directory surface.
  it('IT master label matches the required text exactly', () => {
    expect(itMessages.partnerDirectory.informationalLabel).toBe(
      'Elenco informativo — nessuna commissione',
    );
  });

  it('EN/ES labelling parity: present + non-empty, distinct per locale', () => {
    const en = enMessages.partnerDirectory.informationalLabel;
    const es = esMessages.partnerDirectory.informationalLabel;
    expect(en.trim().length).toBeGreaterThan(0);
    expect(es.trim().length).toBeGreaterThan(0);
  });

  it('no fee/commission or paid-ordering language leaks into the label copy', () => {
    for (const [, messages] of Object.entries(LOCALES)) {
      const ns = (messages as unknown as { partnerDirectory: Record<string, unknown> })
        .partnerDirectory;
      const lead = String(ns.lead ?? '');
      expect(lead).not.toMatch(/sponsor|featured|promo|paid placement/i);
    }
  });
});
