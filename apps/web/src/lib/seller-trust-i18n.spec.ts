/**
 * PP-6 — three-locale coverage for seller VO + checklist surfaces.
 */

import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { SELLER_CHECKLIST_TYPE_CODES } from '@easycasa/shared';

import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import itMessages from '../../messages/it.json';
import { VO_REJECTION_TEMPLATE_KEYS } from './seller-trust';

const LOCALES = {
  it: itMessages as unknown as AbstractIntlMessages,
  en: enMessages as unknown as AbstractIntlMessages,
  es: esMessages as unknown as AbstractIntlMessages,
} as const;

const VO_STATES = [
  'unverified',
  'documents_submitted',
  'in_review',
  'verified',
  'rejected',
  'revoked',
  'expired',
] as const;

describe('sellerTrust i18n (PP-6)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: sellerTrust namespace parity`, () => {
      const t = createTranslator({ locale, messages, namespace: 'sellerTrust' });
      expect(t('page.verificationTitle').length).toBeGreaterThan(8);
      expect(t('page.documentsTitle').length).toBeGreaterThan(8);
      for (const state of VO_STATES) {
        expect(t(`verifiedOwner.state.${state}`).length).toBeGreaterThan(3);
        expect(t(`verifiedOwner.stateHint.${state}`).length).toBeGreaterThan(8);
      }
      for (const code of SELLER_CHECKLIST_TYPE_CODES) {
        expect(t(`checklist.slots.${code}.title`).length).toBeGreaterThan(2);
        expect(t(`checklist.slots.${code}.hint`).length).toBeGreaterThan(8);
      }
      for (const key of VO_REJECTION_TEMPLATE_KEYS) {
        expect(t(`rejectionTemplates.${key}`).length).toBeGreaterThan(12);
      }
    });

    it(`${locale}: portal / no-mediation guard on VO lead`, () => {
      const t = createTranslator({ locale, messages, namespace: 'sellerTrust' });
      const lead = t('verifiedOwner.lead').toLowerCase();
      expect(lead.includes('mediat') || lead.includes('broker') || lead.includes('legal')).toBe(
        true,
      );
    });
  }
});
