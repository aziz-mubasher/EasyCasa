import { BOOST_DURATIONS_DAYS, type BoostDurationDays } from '@easycasa/shared';

export type SellerListingBoostWire = {
  active: boolean;
  endsAt: string | null;
  remainingDays: number | null;
};

export type SellerListingItemWire = {
  id: string;
  slug: string | null;
  title: string;
  status: string;
  city: string | null;
  price: string | null;
  currency: string;
  coverUrl: string | null;
  boost: SellerListingBoostWire | null;
};

export type SellerListingsResponse = {
  flags: {
    listingBoostEnabled: boolean;
    sellerPremiumEnabled: boolean;
  };
  items: SellerListingItemWire[];
};

export type TierEntitlementsWire = {
  maxActiveListings: number;
  maxUploadsPerDay: number;
  analyticsWindowDays: number;
  priorityModeration: boolean;
};

export type SellerEntitlementsResponse = {
  tier: 'free' | 'premium';
  entitlements: TierEntitlementsWire;
  quota: {
    maxActiveListings: number;
    maxUploadsPerDay: number;
    timeZone: string;
  };
  source: 'seller_subscription';
};

export type BoostCtaState = 'hidden' | 'buy' | 'active';

export type QuotaErrorCode = 'errors.quota.activeListings' | 'errors.quota.uploadsPerDay';

export function parseSellerListingsResponse(raw: unknown): SellerListingsResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Partial<SellerListingsResponse>;
  if (!body.flags || !Array.isArray(body.items)) return null;
  return {
    flags: {
      listingBoostEnabled: body.flags.listingBoostEnabled === true,
      sellerPremiumEnabled: body.flags.sellerPremiumEnabled === true,
    },
    items: body.items,
  };
}

export function parseSellerEntitlementsResponse(raw: unknown): SellerEntitlementsResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Partial<SellerEntitlementsResponse>;
  if (body.tier !== 'free' && body.tier !== 'premium') return null;
  if (!body.entitlements || !body.quota) return null;
  return body as SellerEntitlementsResponse;
}

export function resolveBoostCtaState(opts: {
  listingStatus: string;
  boostEnabled: boolean;
  boost: SellerListingBoostWire | null;
}): BoostCtaState {
  if (!opts.boostEnabled || opts.boost === null) return 'hidden';
  if (opts.listingStatus !== 'published') return 'hidden';
  return opts.boost.active ? 'active' : 'buy';
}

export function isBoostDuration(raw: number): raw is BoostDurationDays {
  return (BOOST_DURATIONS_DAYS as readonly number[]).includes(raw);
}

export function shouldShowPremiumUpsell(opts: {
  premiumEnabled: boolean;
  tier: 'free' | 'premium' | null;
  quotaCode: QuotaErrorCode | null;
}): boolean {
  if (!opts.premiumEnabled) return false;
  if (opts.tier === 'premium') return false;
  if (!opts.quotaCode) return false;
  return (
    opts.quotaCode === 'errors.quota.activeListings' ||
    opts.quotaCode === 'errors.quota.uploadsPerDay'
  );
}

export function parseQuotaErrorCode(raw: unknown): QuotaErrorCode | null {
  if (!raw || typeof raw !== 'object') return null;
  const code = (raw as { code?: unknown }).code;
  if (code === 'errors.quota.activeListings' || code === 'errors.quota.uploadsPerDay') {
    return code;
  }
  return null;
}

export function billingReturnKind(
  param: string | null | undefined,
): 'success' | 'cancel' | null {
  if (param === 'success') return 'success';
  if (param === 'cancel') return 'cancel';
  return null;
}
