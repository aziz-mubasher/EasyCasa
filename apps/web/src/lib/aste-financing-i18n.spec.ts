import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { PRODUCT_EVENTS, productAnalytics, trackProduct } from './product-analytics';
import {
  ASTE_REPORT_BANKS4ALL_UTM,
  getBanks4AllReferralUrl,
} from './banks4all-referral';
import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import itMessages from '../../messages/it.json';

const LOCALES = {
  it: itMessages as unknown as AbstractIntlMessages,
  en: enMessages as unknown as AbstractIntlMessages,
  es: esMessages as unknown as AbstractIntlMessages,
} as const;

describe('banks4AllReferral.aste i18n (EC-28)', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}: aste title + lead-in keys present`, () => {
      const t = createTranslator({ locale, messages, namespace: 'banks4AllReferral' });
      expect(t.has('aste.title')).toBe(true);
      expect(t.has('aste.leadIn.financing_need')).toBe(true);
      expect(t.has('aste.leadIn.readiness_financing')).toBe(true);
      expect(t.has('aste.leadIn.mutuabilita')).toBe(true);
      // Reused approved claims still present
      expect(t.has('heroTrustLine')).toBe(true);
      expect(t.has('heroFreeBadge')).toBe(true);
      expect(t.has('heroPrimaryCta')).toBe(true);
    });
  }

  it('ES lead-ins resolve (flagged for owner review)', () => {
    const t = createTranslator({
      locale: 'es',
      messages: LOCALES.es,
      namespace: 'banks4AllReferral',
    });
    expect(t('aste.leadIn.financing_need')).toMatch(/fianza/i);
    expect(t('aste.leadIn.mutuabilita')).toMatch(/financiabilidad/i);
  });
});

describe('EC-28 financing events payload shape', () => {
  it('shown/clicked events accept only safe props', () => {
    productAnalytics.clear();
    trackProduct(PRODUCT_EVENTS.ASTE_FINANCING_BLOCK_SHOWN, {
      trigger: 'financing_need',
      locale: 'it',
      provincia: 'MI',
    });
    trackProduct(PRODUCT_EVENTS.ASTE_FINANCING_CTA_CLICKED, {
      trigger: 'financing_need',
      locale: 'it',
      provincia: 'MI',
      entry: 'propertyPlanPortal',
    });
    const shown = productAnalytics.of(PRODUCT_EVENTS.ASTE_FINANCING_BLOCK_SHOWN)[0]!;
    const clicked = productAnalytics.of(PRODUCT_EVENTS.ASTE_FINANCING_CTA_CLICKED)[0]!;
    for (const props of [shown.props, clicked.props]) {
      expect(props).not.toHaveProperty('analysisId');
      expect(props).not.toHaveProperty('userId');
      expect(props).not.toHaveProperty('rge');
      expect(props).not.toHaveProperty('address');
      expect(props).not.toHaveProperty('email');
    }
    expect(PRODUCT_EVENTS.ASTE_FINANCING_BLOCK_SHOWN).toBe('aste_financing_block_shown');
    expect(PRODUCT_EVENTS.ASTE_FINANCING_CTA_CLICKED).toBe('aste_financing_cta_clicked');
  });

  it('outbound href for aste campaign has no id params', () => {
    const href = getBanks4AllReferralUrl('es', 'propertyPlanPortal', ASTE_REPORT_BANKS4ALL_UTM);
    expect(href).toContain('/es/property-plan');
    expect(href).toContain('utm_campaign=aste');
    expect(href).not.toMatch(/analysisId|userId|rge=|address=/i);
  });
});
