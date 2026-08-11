/**
 * EC-S-T27 — Seller tier entitlements (@easycasa/shared).
 *
 * Resolves a seller's effective tier from Stripe subscription state and maps
 * it to concrete entitlements, including the quota overrides consumed by the
 * live 429 path (uploadQuota module).
 *
 * Pricing-model constraint (T04 matrix row 8 / engineering rule 4): every
 * price is FLAT-FEE and success-independent. Nothing in this module may key
 * off sale outcomes or listing price — entitlements derive from subscription
 * state ONLY.
 *
 * Env numbers (SELLER_MAX_*) remain the FREE-tier baseline; premium values
 * are explicit config here, not multipliers of env (predictable, auditable).
 */

import type { QuotaConfig } from '../upload-quota/uploadQuota';

export type SellerTier = 'free' | 'premium';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export interface SellerSubscription {
  status: SubscriptionStatus;
  /** End of the paid period (Stripe current_period_end). */
  currentPeriodEnd: Date;
  /** True when the user cancelled but the period is already paid. */
  cancelAtPeriodEnd: boolean;
}

export interface TierEntitlements {
  maxActiveListings: number;
  maxUploadsPerDay: number;
  /** Analytics window the dashboard may query (days). */
  analyticsWindowDays: number;
  priorityModeration: boolean;
}

export interface EntitlementConfig {
  free: TierEntitlements;
  premium: TierEntitlements;
  /** Days past currentPeriodEnd during which past_due keeps premium (dunning). */
  pastDueGraceDays: number;
}

export const DEFAULT_ENTITLEMENTS: EntitlementConfig = {
  free: {
    maxActiveListings: 5,
    maxUploadsPerDay: 20,
    analyticsWindowDays: 30,
    priorityModeration: false,
  },
  premium: {
    maxActiveListings: 20,
    maxUploadsPerDay: 100,
    analyticsWindowDays: 365,
    priorityModeration: true,
  },
  pastDueGraceDays: 7,
};

/**
 * Effective tier at `now`.
 * - active: premium through currentPeriodEnd (cancelAtPeriodEnd irrelevant
 *   until the period actually ends — the user paid for it).
 * - past_due: premium through currentPeriodEnd + grace (dunning window),
 *   then free.
 * - canceled / no subscription: free.
 */
export function resolveTier(
  sub: SellerSubscription | null,
  now: Date,
  cfg: EntitlementConfig = DEFAULT_ENTITLEMENTS,
): SellerTier {
  if (!sub) return 'free';
  const end = sub.currentPeriodEnd.getTime();
  switch (sub.status) {
    case 'active':
      return now.getTime() < end ? 'premium' : 'free';
    case 'past_due': {
      const graceEnd = end + cfg.pastDueGraceDays * 86_400_000;
      return now.getTime() < graceEnd ? 'premium' : 'free';
    }
    case 'canceled':
      return 'free';
  }
}

export function entitlementsFor(
  tier: SellerTier,
  cfg: EntitlementConfig = DEFAULT_ENTITLEMENTS,
): TierEntitlements {
  return cfg[tier];
}

/**
 * Quota override for the live 429 path: env-derived base config stays the
 * floor; a tier may only RAISE limits, never lower below base (protects
 * against misconfig accidentally throttling free users harder than env).
 */
export function quotaConfigFor(
  tier: SellerTier,
  base: QuotaConfig,
  cfg: EntitlementConfig = DEFAULT_ENTITLEMENTS,
): QuotaConfig {
  const e = entitlementsFor(tier, cfg);
  return {
    ...base,
    maxActiveListings: Math.max(base.maxActiveListings, e.maxActiveListings),
    maxUploadsPerDay: Math.max(base.maxUploadsPerDay, e.maxUploadsPerDay),
  };
}
