import { describe, expect, it } from 'vitest';
import {
  ASTE_REPORT_BANKS4ALL_UTM,
  BANKS4ALL_PORTAL_ORIGIN,
  BANKS4ALL_SITE_ORIGIN,
  DEFAULT_BANKS4ALL_REFERRAL_ENTRY,
  getBanks4AllReferralUrl,
} from './banks4all-referral';

describe('getBanks4AllReferralUrl', () => {
  it('uses the property-plan portal as the default qualification entry per locale', () => {
    expect(getBanks4AllReferralUrl('it')).toBe(`${BANKS4ALL_PORTAL_ORIGIN}/it/property-plan`);
    expect(getBanks4AllReferralUrl('en')).toBe(`${BANKS4ALL_PORTAL_ORIGIN}/en/property-plan`);
    expect(getBanks4AllReferralUrl('es')).toBe(`${BANKS4ALL_PORTAL_ORIGIN}/es/property-plan`);
    expect(DEFAULT_BANKS4ALL_REFERRAL_ENTRY).toBe('propertyPlanPortal');
  });

  it('supports the property investment plan info page without query params', () => {
    expect(getBanks4AllReferralUrl('en', 'propertyInvestmentPlan')).toBe(
      `${BANKS4ALL_SITE_ORIGIN}/en/property-investment-plan`,
    );
    expect(getBanks4AllReferralUrl('it', 'propertyInvestmentPlan')).toBe(
      `${BANKS4ALL_SITE_ORIGIN}/it/property-investment-plan`,
    );
    expect(getBanks4AllReferralUrl('es', 'propertyInvestmentPlan')).toBe(
      `${BANKS4ALL_SITE_ORIGIN}/es/property-investment-plan`,
    );
  });

  it('supports discovery call and transparency pages', () => {
    expect(getBanks4AllReferralUrl('it', 'discoveryCall')).toBe(
      `${BANKS4ALL_SITE_ORIGIN}/it/book/discovery-call`,
    );
    expect(getBanks4AllReferralUrl('en', 'transparency')).toBe(
      `${BANKS4ALL_SITE_ORIGIN}/en/transparency`,
    );
  });

  it('supports NiB Property pages per locale', () => {
    expect(getBanks4AllReferralUrl('it', 'nibProperty')).toBe(`${BANKS4ALL_SITE_ORIGIN}/it/nib`);
    expect(getBanks4AllReferralUrl('en', 'nibProperty')).toBe(`${BANKS4ALL_SITE_ORIGIN}/en/nib`);
    expect(getBanks4AllReferralUrl('es', 'nibProperty')).toBe(`${BANKS4ALL_SITE_ORIGIN}/es/nib`);
  });

  it('EC-28 aste UTM: locale path + campaign params, no identifiers', () => {
    const href = getBanks4AllReferralUrl('it', 'propertyPlanPortal', ASTE_REPORT_BANKS4ALL_UTM);
    const u = new URL(href);
    expect(u.origin).toBe(BANKS4ALL_PORTAL_ORIGIN);
    expect(u.pathname).toBe('/it/property-plan');
    expect(u.searchParams.get('utm_source')).toBe('easycasa');
    expect(u.searchParams.get('utm_medium')).toBe('aste_report');
    expect(u.searchParams.get('utm_campaign')).toBe('aste');
    // ABSENCE of any analysis / user / property identifiers
    for (const forbidden of [
      'analysis',
      'analysis_id',
      'analysisId',
      'user',
      'user_id',
      'userId',
      'rge',
      'address',
      'indirizzo',
      'lotto',
    ]) {
      expect(u.searchParams.has(forbidden)).toBe(false);
      expect(href.toLowerCase()).not.toContain(`${forbidden}=`);
    }
  });

  it('listing default still has no query string', () => {
    expect(getBanks4AllReferralUrl('en').includes('?')).toBe(false);
  });
});
