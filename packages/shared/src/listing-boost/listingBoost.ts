/**
 * EC-S-T26 — listing boost helpers (flat-fee, success-independent).
 * Ranking weight is bounded so organic relevance is not buried.
 */

export const BOOST_DURATIONS_DAYS = [7, 30] as const;
export type BoostDurationDays = (typeof BOOST_DURATIONS_DAYS)[number];

/** Flat EUR cents — T04 row 8: fixed amounts, never listing-price contingent. */
export const BOOST_FLAT_PRICE_CENTS: Record<BoostDurationDays, number> = {
  7: 990,
  30: 2490,
};

/** Max Meili boostWeight contribution (conservative fairness default). */
export const BOOST_WEIGHT_CAP = 10;
export const BOOST_WEIGHT_ACTIVE = 8;

export function isBoostDurationDays(raw: number): raw is BoostDurationDays {
  return raw === 7 || raw === 30;
}

export function boostFlatPriceCents(days: BoostDurationDays): number {
  return BOOST_FLAT_PRICE_CENTS[days];
}

export function clampBoostWeight(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(BOOST_WEIGHT_CAP, Math.floor(raw));
}

/** Remaining ms when pausing at `now` (0 if already ended). */
export function remainingBoostMs(endsAt: Date, now: Date): number {
  return Math.max(0, endsAt.getTime() - now.getTime());
}

/** Resume: new ends_at from remaining. */
export function resumeBoostEndsAt(remainingMs: number, now: Date): Date {
  return new Date(now.getTime() + Math.max(0, remainingMs));
}

export function isBoostActive(opts: {
  status: string;
  startsAt: Date;
  endsAt: Date;
  now: Date;
}): boolean {
  if (opts.status !== 'active') return false;
  const t = opts.now.getTime();
  return t >= opts.startsAt.getTime() && t < opts.endsAt.getTime();
}
