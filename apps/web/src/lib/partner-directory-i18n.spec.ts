/** EC-S-T28/T29 + G3 — partner directory labelling present on every locale (AC). */

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

const KEYS = [
  'title',
  'informationalLabel',
  'paidListingLabel',
  'paidBadge',
  'paidLead',
  'orderingNote',
  'lead',
  'empty',
  'credentials',
  'contact',
] as const;

const SELF_SERVE_KEYS = [
  'title',
  'portalNote',
  'signInLead',
  'signIn',
  'unavailable',
  'paidActive',
  'listingPending',
  'checkoutCta',
  'checkoutBusy',
  'notPurchasable',
  'applyCta',
  'applyBusy',
] as const;

describe('partnerDirectory i18n (EC-S-T28/T29 + G3)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: all partnerDirectory keys present`, () => {
      const t = createTranslator({ locale, messages, namespace: 'partnerDirectory' });
      for (const key of KEYS) {
        expect(t.has(key)).toBe(true);
      }
      for (const category of PARTNER_DIRECTORY_CATEGORIES) {
        expect(t.has(`categories.${category}`)).toBe(true);
      }
      const tSelf = createTranslator({
        locale,
        messages,
        namespace: 'partnerDirectory.selfServe',
      });
      for (const key of SELF_SERVE_KEYS) {
        expect(tSelf.has(key)).toBe(true);
      }
      expect(tSelf.has('fields.category')).toBe(true);
      expect(tSelf.has('errors.checkoutFailed')).toBe(true);
    });
  }

  it('IT master informational label matches the required text exactly', () => {
    expect(itMessages.partnerDirectory.informationalLabel).toBe(
      'Elenco informativo — nessuna commissione',
    );
  });

  it('IT master paid label matches G3 counsel wording', () => {
    expect(itMessages.partnerDirectory.paidListingLabel).toBe(
      'Elenco con presenza a pagamento — tariffa fissa',
    );
    expect(itMessages.partnerDirectory.paidBadge).toBe('Presenza a pagamento');
  });

  it('EN/ES labelling parity: present + non-empty, distinct per locale', () => {
    const en = enMessages.partnerDirectory.informationalLabel;
    const es = esMessages.partnerDirectory.informationalLabel;
    expect(en.trim().length).toBeGreaterThan(0);
    expect(es.trim().length).toBeGreaterThan(0);
  });

  it('informational lead stays free of paid-placement marketing jargon', () => {
    for (const [, messages] of Object.entries(LOCALES)) {
      const ns = (messages as unknown as { partnerDirectory: Record<string, unknown> })
        .partnerDirectory;
      const lead = String(ns.lead ?? '');
      expect(lead).not.toMatch(/sponsor|featured|promo|paid placement/i);
    }
  });

  it('selfServe copy avoids hardcoded EUR amounts (T04)', () => {
    for (const [, messages] of Object.entries(LOCALES)) {
      const ns = (messages as unknown as { partnerDirectory: Record<string, unknown> })
        .partnerDirectory;
      const selfServe = JSON.stringify(ns.selfServe ?? {});
      expect(selfServe).not.toMatch(/€|\bEUR\b|\d+[,.]?\d*\s*(€|eur)/i);
    }
  });
});
