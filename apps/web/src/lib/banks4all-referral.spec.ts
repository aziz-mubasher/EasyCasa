import { describe, expect, it } from 'vitest';
import {
  BANKS4ALL_CLIENT_PORTAL_URL,
  BANKS4ALL_SITE_ORIGIN,
  DEFAULT_BANKS4ALL_REFERRAL_ENTRY,
  getBanks4AllReferralUrl,
} from './banks4all-referral';

describe('getBanks4AllReferralUrl', () => {
  it('uses Plan+Mutuo as the default qualification entry per locale', () => {
    expect(getBanks4AllReferralUrl('it')).toBe(`${BANKS4ALL_SITE_ORIGIN}/it/plan-mutuo`);
    expect(getBanks4AllReferralUrl('en')).toBe(`${BANKS4ALL_SITE_ORIGIN}/en/plan-mutuo`);
    expect(getBanks4AllReferralUrl('es')).toBe(`${BANKS4ALL_SITE_ORIGIN}/es/plan-mutuo`);
    expect(DEFAULT_BANKS4ALL_REFERRAL_ENTRY).toBe('planMutuo');
  });

  it('supports alternate configured entries without query params', () => {
    expect(getBanks4AllReferralUrl('en', 'pop')).toBe(`${BANKS4ALL_SITE_ORIGIN}/en/pop`);
    expect(getBanks4AllReferralUrl('it', 'clientPortal')).toBe(BANKS4ALL_CLIENT_PORTAL_URL);
  });
});
