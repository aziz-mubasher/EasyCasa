/**
 * EC-S-T31 — three-locale coverage for seller wizard + analytics dashboard.
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

const WIZARD_KEYS = [
  'signInTitle',
  'onboardingRequired',
  'createFailed',
  'saveFailed',
  'submitFailed',
  'quotaExceeded',
  'viewListing',
  'fields.title',
  'fields.price',
  'fields.description',
] as const;

const ANALYTICS_KEYS = [
  'title',
  'lead',
  'signIn',
  'signInCta',
  'loading',
  'error',
  'unavailable',
  'views',
  'enquiries',
  'window.30d',
] as const;

describe('seller wizard i18n (T31)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: sellerWizard keys render`, () => {
      const t = createTranslator({ locale, messages, namespace: 'sellerWizard' });
      for (const key of WIZARD_KEYS) {
        expect(t.has(key)).toBe(true);
        expect(String(t(key as never)).length).toBeGreaterThan(1);
      }
    });
  }

  it('EN/ES cover the same sellerWizard keys as IT', () => {
    const itKeys = Object.keys(itMessages.sellerWizard);
    for (const k of itKeys) {
      expect(enMessages.sellerWizard).toHaveProperty(k);
      expect(esMessages.sellerWizard).toHaveProperty(k);
    }
  });
});

describe('seller analytics dashboard i18n (T31)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: sellerAnalytics keys render`, () => {
      const t = createTranslator({ locale, messages, namespace: 'sellerAnalytics' });
      for (const key of ANALYTICS_KEYS) {
        expect(t.has(key)).toBe(true);
        expect(String(t(key as never)).length).toBeGreaterThan(1);
      }
    });
  }

  it('EN/ES cover the same sellerAnalytics keys as IT', () => {
    const walk = (obj: Record<string, unknown>, prefix = ''): string[] => {
      const out: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          out.push(...walk(v as Record<string, unknown>, path));
        } else out.push(path);
      }
      return out;
    };
    for (const path of walk(itMessages.sellerAnalytics as Record<string, unknown>)) {
      const parts = path.split('.');
      let en: unknown = enMessages.sellerAnalytics;
      let es: unknown = esMessages.sellerAnalytics;
      for (const p of parts) {
        en = (en as Record<string, unknown>)[p];
        es = (es as Record<string, unknown>)[p];
      }
      expect(en, `en missing ${path}`).toBeTruthy();
      expect(es, `es missing ${path}`).toBeTruthy();
    }
  });
});

describe('errors.quota keys (T31)', () => {
  it('IT/EN/ES expose quota error codes used by the 429 path', () => {
    for (const messages of [itMessages, enMessages, esMessages]) {
      expect(messages.errors?.quota?.uploadsPerDay).toBeTruthy();
      expect(messages.errors?.quota?.activeListings).toBeTruthy();
    }
  });
});
