import { describe, expect, it } from 'vitest';

import {
  billingReturnKind,
  parseQuotaErrorCode,
  parseSellerEntitlementsResponse,
  parseSellerListingsResponse,
  resolveBoostCtaState,
  shouldShowPremiumUpsell,
} from './seller-monetisation';

describe('seller monetisation helpers (PP-5)', () => {
  it('resolveBoostCtaState: active boost locks purchase', () => {
    expect(
      resolveBoostCtaState({
        listingStatus: 'published',
        boostEnabled: true,
        boost: { active: true, endsAt: '2026-08-20T00:00:00.000Z', remainingDays: 5 },
      }),
    ).toBe('active');
  });

  it('resolveBoostCtaState: flag off hides surface', () => {
    expect(
      resolveBoostCtaState({
        listingStatus: 'published',
        boostEnabled: false,
        boost: null,
      }),
    ).toBe('hidden');
  });

  it('resolveBoostCtaState: unpublished hides buy', () => {
    expect(
      resolveBoostCtaState({
        listingStatus: 'draft',
        boostEnabled: true,
        boost: { active: false, endsAt: null, remainingDays: null },
      }),
    ).toBe('hidden');
  });

  it('shouldShowPremiumUpsell only for free tier quota hits', () => {
    expect(
      shouldShowPremiumUpsell({
        premiumEnabled: true,
        tier: 'free',
        quotaCode: 'errors.quota.activeListings',
      }),
    ).toBe(true);
    expect(
      shouldShowPremiumUpsell({
        premiumEnabled: true,
        tier: 'premium',
        quotaCode: 'errors.quota.activeListings',
      }),
    ).toBe(false);
    expect(
      shouldShowPremiumUpsell({
        premiumEnabled: false,
        tier: 'free',
        quotaCode: 'errors.quota.activeListings',
      }),
    ).toBe(false);
  });

  it('parseSellerListingsResponse reads flag matrix', () => {
    const parsed = parseSellerListingsResponse({
      flags: { listingBoostEnabled: true, sellerPremiumEnabled: false },
      items: [],
    });
    expect(parsed?.flags.sellerPremiumEnabled).toBe(false);
  });

  it('parseSellerEntitlementsResponse validates tier', () => {
    expect(parseSellerEntitlementsResponse({ tier: 'nope' })).toBeNull();
    expect(
      parseSellerEntitlementsResponse({
        tier: 'free',
        entitlements: {
          maxActiveListings: 5,
          maxUploadsPerDay: 20,
          analyticsWindowDays: 90,
          priorityModeration: false,
        },
        quota: { maxActiveListings: 5, maxUploadsPerDay: 20, timeZone: 'Europe/Rome' },
        source: 'seller_subscription',
      })?.tier,
    ).toBe('free');
  });

  it('parseQuotaErrorCode accepts API 429 codes', () => {
    expect(parseQuotaErrorCode({ code: 'errors.quota.uploadsPerDay' })).toBe(
      'errors.quota.uploadsPerDay',
    );
  });

  it('billingReturnKind maps Stripe return query', () => {
    expect(billingReturnKind('success')).toBe('success');
    expect(billingReturnKind('cancel')).toBe('cancel');
    expect(billingReturnKind('other')).toBeNull();
  });
});
