import { describe, expect, it } from 'vitest';
import {
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
});
