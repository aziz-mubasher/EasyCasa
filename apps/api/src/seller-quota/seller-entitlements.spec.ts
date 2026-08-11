/** EC-S-T27 — entitlement resolution tests (artifact parity in API CI). */

import { describe, it, expect } from 'vitest';
import {
  resolveTier,
  entitlementsFor,
  quotaConfigFor,
  DEFAULT_ENTITLEMENTS,
  type SellerSubscription,
  type QuotaConfig,
} from '@easycasa/shared';

const NOW = new Date('2026-08-11T12:00:00Z');
const D = (s: string) => new Date(s);

const baseQuota: QuotaConfig = {
  maxActiveListings: 5,
  maxUploadsPerDay: 20,
  timeZone: 'Europe/Rome',
};

function sub(p: Partial<SellerSubscription>): SellerSubscription {
  return {
    status: 'active',
    currentPeriodEnd: D('2026-09-01T00:00:00Z'),
    cancelAtPeriodEnd: false,
    ...p,
  };
}

describe('resolveTier', () => {
  it('no subscription ⇒ free', () => {
    expect(resolveTier(null, NOW)).toBe('free');
  });

  it('active within period ⇒ premium; at/after period end ⇒ free', () => {
    expect(resolveTier(sub({}), NOW)).toBe('premium');
    expect(resolveTier(sub({ currentPeriodEnd: NOW }), NOW)).toBe('free');
    expect(resolveTier(sub({ currentPeriodEnd: D('2026-08-01T00:00:00Z') }), NOW)).toBe(
      'free',
    );
  });

  it('cancelAtPeriodEnd keeps premium until the paid period ends', () => {
    expect(resolveTier(sub({ cancelAtPeriodEnd: true }), NOW)).toBe('premium');
    expect(
      resolveTier(
        sub({ cancelAtPeriodEnd: true, currentPeriodEnd: D('2026-08-10T00:00:00Z') }),
        NOW,
      ),
    ).toBe('free');
  });

  it('past_due holds premium through the grace window, then free', () => {
    const pd = sub({ status: 'past_due', currentPeriodEnd: D('2026-08-08T12:00:00Z') });
    expect(resolveTier(pd, NOW)).toBe('premium');
    const pdOld = sub({ status: 'past_due', currentPeriodEnd: D('2026-08-01T00:00:00Z') });
    expect(resolveTier(pdOld, NOW)).toBe('free');
  });

  it('canceled ⇒ free even inside a paid period (refund path)', () => {
    expect(resolveTier(sub({ status: 'canceled' }), NOW)).toBe('free');
  });
});

describe('entitlementsFor', () => {
  it('maps tiers to concrete limits', () => {
    expect(entitlementsFor('free').priorityModeration).toBe(false);
    expect(entitlementsFor('premium')).toEqual(DEFAULT_ENTITLEMENTS.premium);
  });
});

describe('quotaConfigFor', () => {
  it('premium raises listing and upload caps, preserves timezone', () => {
    const q = quotaConfigFor('premium', baseQuota);
    expect(q).toEqual({
      maxActiveListings: 20,
      maxUploadsPerDay: 100,
      timeZone: 'Europe/Rome',
    });
  });

  it('free tier passes base through unchanged', () => {
    expect(quotaConfigFor('free', baseQuota)).toEqual(baseQuota);
  });

  it('a tier can only RAISE limits above the env base, never lower', () => {
    const generousEnv: QuotaConfig = {
      maxActiveListings: 50,
      maxUploadsPerDay: 200,
      timeZone: 'Europe/Rome',
    };
    const q = quotaConfigFor('premium', generousEnv);
    expect(q.maxActiveListings).toBe(50);
    expect(q.maxUploadsPerDay).toBe(200);
  });
});
