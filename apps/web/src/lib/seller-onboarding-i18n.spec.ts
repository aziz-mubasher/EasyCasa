/**
 * EC-S PP-4 / K EC 1.47 — sellerOnboarding i18n (IT/EN/ES parity).
 */

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

const KEYS = [
  'title',
  'lead',
  'fields.displayName',
  'fields.phone',
  'fields.phoneHint',
  'informativaNotice',
  'informativaLink',
  'marketingLabel',
  'submit',
  'portalNote',
  'errors.displayNameRequired',
  'errors.submitFailed',
  'errors.versionMissing',
] as const;

function flatKeys(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return prefix ? [prefix] : [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) return flatKeys(v, path);
    return [path];
  });
}

describe('sellerOnboarding i18n (PP-4)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: sellerOnboarding keys render`, () => {
      const t = createTranslator({ locale, messages, namespace: 'sellerOnboarding' });
      for (const key of KEYS) {
        expect(t.has(key), key).toBe(true);
        const text =
          key === 'informativaNotice' ? t(key, { version: 'v1.1' }) : t(key);
        expect(text.length).toBeGreaterThan(8);
      }
    });
  }

  it('EN/ES cover the same sellerOnboarding keys as IT', () => {
    const itKeys = flatKeys(itMessages.sellerOnboarding).sort();
    expect(flatKeys(enMessages.sellerOnboarding).sort()).toEqual(itKeys);
    expect(flatKeys(esMessages.sellerOnboarding).sort()).toEqual(itKeys);
  });

  it('IT portal copy avoids mediazione-adjacent seller onboarding framing', () => {
    const note = itMessages.sellerOnboarding.portalNote.toLowerCase();
    expect(note).toContain('portale');
    expect(note).not.toMatch(/\bmediatore\b/);
  });
});

describe('sellerWizard consentRequired i18n (PP-4)', () => {
  for (const messages of [itMessages, enMessages, esMessages]) {
    it('consentRequired present', () => {
      expect(messages.sellerWizard.consentRequired?.length).toBeGreaterThan(10);
    });
  }
});
