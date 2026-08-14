/**
 * EC-S-T31 — three-locale coverage for seller wizard + analytics dashboard.
 * Pattern: import it/en/es + createTranslator (same as nudges-i18n.spec.ts).
 */

import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { PROPERTY_TYPES, WIZARD_STEPS } from '@easycasa/shared';

import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import itMessages from '../../messages/it.json';

const LOCALES = {
  it: itMessages as unknown as AbstractIntlMessages,
  en: enMessages as unknown as AbstractIntlMessages,
  es: esMessages as unknown as AbstractIntlMessages,
} as const;

const WIZARD_CHROME = [
  'signInTitle',
  'signIn',
  'onboardingRequired',
  'consentRequired',
  'createFailed',
  'saveFailed',
  'navFailed',
  'notReady',
  'quotaExceeded',
  'submitFailed',
  'publishedTitle',
  'publishedBody',
  'viewListing',
  'stepOf',
  'back',
  'next',
  'publish',
] as const;

const WIZARD_FIELDS = [
  'propertyType',
  'title',
  'address',
  'city',
  'province',
  'postalCode',
  'sqm',
  'rooms',
  'bathrooms',
  'price',
  'photoUrls',
  'description',
  'acceptedTerms',
] as const;

const WIZARD_VALIDATION_CODES = [
  'PROPERTY_TYPE_REQUIRED',
  'PROPERTY_TYPE_INVALID',
  'TITLE_REQUIRED',
  'TITLE_TOO_SHORT',
  'ADDRESS_REQUIRED',
  'CITY_REQUIRED',
  'PROVINCE_REQUIRED',
  'PROVINCE_INVALID',
  'POSTAL_CODE_REQUIRED',
  'POSTAL_CODE_INVALID',
  'LAT_INVALID',
  'LNG_INVALID',
  'OMI_ZONE_ID_INVALID',
  'SQM_REQUIRED',
  'SQM_INVALID',
  'ROOMS_REQUIRED',
  'ROOMS_INVALID',
  'BATHROOMS_INVALID',
  'FLOOR_INVALID',
  'YEAR_BUILT_INVALID',
  'PRICE_REQUIRED',
  'PRICE_INVALID',
  'PHOTOS_REQUIRED',
  'PHOTOS_MIN_COUNT',
  'PHOTOS_INVALID',
  'DESCRIPTION_REQUIRED',
  'DESCRIPTION_TOO_SHORT',
  'ACCEPTED_TERMS_REQUIRED',
  'CURRENT_STEP_INVALID',
] as const;

const ANALYTICS_KEYS = [
  'eyebrow',
  'title',
  'lead',
  'windowLabel',
  'window.7d',
  'window.30d',
  'window.90d',
  'views',
  'saves',
  'enquiries',
  'enquiryRate',
  'daysOnMarket',
  'viewsSeries',
  'priceVsOmi',
  'priceVsOmiAbsent',
  'signIn',
  'signInCta',
  'loading',
  'unavailable',
  'error',
] as const;

const INBOX_KEYS = [
  'eyebrow',
  'title',
  'subtitle',
  'empty',
  'unread',
  'unreadTotal',
  'markRead',
  'sortLabel',
  'sortNewest',
  'sortBadgeFirst',
  'sortUnreadFirst',
  'filterBadgedOnly',
  'filterUnreadOnly',
  'viewingRequest',
  'listingLink',
  'signIn',
  'signInCta',
  'loading',
  'unavailable',
  'error',
  'badge.valid',
  'badge.expired',
  'bandMax',
  'holderInitials',
  'receivedAt',
] as const;

function flatKeys(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return prefix ? [prefix] : [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) return flatKeys(v, path);
    return [path];
  });
}

describe('seller wizard i18n (T31)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: sellerWizard chrome + steps + fields render`, () => {
      const t = createTranslator({ locale, messages, namespace: 'sellerWizard' });
      for (const key of WIZARD_CHROME) {
        expect(t.has(key)).toBe(true);
      }
      // ICU: provide values when resolving
      expect(t('stepOf', { n: 1, total: 7 }).length).toBeGreaterThan(3);
      for (const step of WIZARD_STEPS) {
        expect(t.has(`steps.${step}`)).toBe(true);
        expect(t(`steps.${step}`).length).toBeGreaterThan(1);
      }
      for (const field of WIZARD_FIELDS) {
        expect(t.has(`fields.${field}`)).toBe(true);
        expect(t(`fields.${field}`).length).toBeGreaterThan(1);
      }
    });

    it(`${locale}: sellerWizard propertyTypes + validation codes present`, () => {
      const t = createTranslator({ locale, messages, namespace: 'sellerWizard' });
      for (const p of PROPERTY_TYPES) {
        expect(t.has(`propertyTypes.${p}`)).toBe(true);
        expect(t(`propertyTypes.${p}`).length).toBeGreaterThan(1);
      }
      for (const code of WIZARD_VALIDATION_CODES) {
        expect(t.has(`validation.${code}`)).toBe(true);
        expect(t(`validation.${code}`).length).toBeGreaterThan(3);
      }
    });
  }

  it('EN/ES cover the same sellerWizard keys as IT', () => {
    const itKeys = flatKeys(itMessages.sellerWizard).sort();
    expect(flatKeys(enMessages.sellerWizard).sort()).toEqual(itKeys);
    expect(flatKeys(esMessages.sellerWizard).sort()).toEqual(itKeys);
  });
});

describe('seller analytics dashboard i18n (T31)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: sellerAnalytics keys render`, () => {
      const t = createTranslator({ locale, messages, namespace: 'sellerAnalytics' });
      for (const key of ANALYTICS_KEYS) {
        expect(t.has(key)).toBe(true);
      }
      expect(t('priceVsOmi', { pct: '+3%' }).length).toBeGreaterThan(8);
      expect(t('title').length).toBeGreaterThan(1);
    });
  }

  it('EN/ES cover the same sellerAnalytics keys as IT', () => {
    const itKeys = flatKeys(itMessages.sellerAnalytics).sort();
    expect(flatKeys(enMessages.sellerAnalytics).sort()).toEqual(itKeys);
    expect(flatKeys(esMessages.sellerAnalytics).sort()).toEqual(itKeys);
  });
});

describe('seller inbox i18n (T20/T31)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: sellerInbox keys render`, () => {
      const t = createTranslator({ locale, messages, namespace: 'sellerInbox' });
      for (const key of INBOX_KEYS) {
        expect(t.has(key)).toBe(true);
      }
      expect(t('unreadTotal', { count: 2 }).length).toBeGreaterThan(5);
      expect(t('bandMax', { amount: '€250,000' }).length).toBeGreaterThan(5);
      expect(t('receivedAt', { when: '12 Aug 2026' }).length).toBeGreaterThan(5);
      expect(t('title').length).toBeGreaterThan(1);
    });
  }

  it('EN/ES cover the same sellerInbox keys as IT', () => {
    const itKeys = flatKeys(itMessages.sellerInbox).sort();
    expect(flatKeys(enMessages.sellerInbox).sort()).toEqual(itKeys);
    expect(flatKeys(esMessages.sellerInbox).sort()).toEqual(itKeys);
  });
});

describe('errors.quota keys (T31)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: errors.quota keys render`, () => {
      const t = createTranslator({ locale, messages, namespace: 'errors.quota' });
      expect(t.has('activeListings')).toBe(true);
      expect(t.has('uploadsPerDay')).toBe(true);
      expect(t('activeListings').length).toBeGreaterThan(8);
      expect(t('uploadsPerDay').length).toBeGreaterThan(8);
    });
  }

  it('IT/EN/ES expose quota error codes used by the 429 path', () => {
    for (const messages of [itMessages, enMessages, esMessages]) {
      expect(messages.errors?.quota?.uploadsPerDay).toBeTruthy();
      expect(messages.errors?.quota?.activeListings).toBeTruthy();
    }
  });
});
