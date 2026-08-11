/**
 * EC-S T19.1 hardening — quota evaluation (@easycasa/shared).
 *
 * Pure logic behind the Nest 429 interceptor. Daily windows are bucketed by
 * LOCAL Europe/Rome calendar day (not rolling 24h, not UTC): a seller's
 * "20 uploads per day" resets at their midnight, and the bucket boundary must
 * survive DST transitions (known bug class — DST slot edge cases).
 *
 * Quota enforcement is platform-rule execution under Art. 6(1)(b) — NOT
 * LIA-gated (decision recorded in roadmap delta 2026-08-10). LIA applies to
 * dup-detect automated blocking only.
 *
 * Dependency-free: uses Intl for timezone math (no date libs).
 */

export interface QuotaConfig {
  /** SELLER_MAX_ACTIVE_LISTINGS (default 5) */
  maxActiveListings: number;
  /** SELLER_MAX_UPLOADS_PER_DAY (default 20) */
  maxUploadsPerDay: number;
  /** IANA zone; product default Europe/Rome */
  timeZone: string;
}

export const DEFAULT_QUOTA: QuotaConfig = {
  maxActiveListings: 5,
  maxUploadsPerDay: 20,
  timeZone: 'Europe/Rome',
};

export interface QuotaDecision {
  allowed: boolean;
  /** How many more actions fit in the current window (0 when denied). */
  remaining: number;
  /** Present when denied on a daily window: seconds until local midnight. */
  retryAfterSeconds?: number;
}

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function dtf(timeZone: string): Intl.DateTimeFormat {
  let f = dtfCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dtfCache.set(timeZone, f);
  }
  return f;
}

/** Local calendar-day key, e.g. "2026-03-29", in the given zone. */
export function localDayKey(at: Date, timeZone: string): string {
  return dtf(timeZone).format(at); // en-CA yields YYYY-MM-DD
}

/**
 * Milliseconds until the next local midnight in `timeZone`.
 * Binary search over [now, now+50h] for the first instant whose day key
 * differs — exact across DST (23h and 25h days), no offset arithmetic.
 */
export function msUntilNextLocalMidnight(now: Date, timeZone: string): number {
  const todayKey = localDayKey(now, timeZone);
  let lo = now.getTime();
  let hi = now.getTime() + 50 * 3600_000;
  if (localDayKey(new Date(hi), timeZone) === todayKey) {
    throw new Error(`no day boundary within 50h for zone ${timeZone}`);
  }
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (localDayKey(new Date(mid), timeZone) === todayKey) lo = mid;
    else hi = mid;
  }
  return hi - now.getTime();
}

/** Daily upload quota: counts prior uploads in the seller's current local day. */
export function evaluateUploadQuota(
  now: Date,
  priorUploadTimes: readonly Date[],
  cfg: QuotaConfig = DEFAULT_QUOTA,
): QuotaDecision {
  if (cfg.maxUploadsPerDay <= 0) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(msUntilNextLocalMidnight(now, cfg.timeZone) / 1000),
    };
  }
  const today = localDayKey(now, cfg.timeZone);
  let used = 0;
  for (const t of priorUploadTimes) {
    if (localDayKey(t, cfg.timeZone) === today) used += 1;
  }
  const remaining = Math.max(0, cfg.maxUploadsPerDay - used);
  if (remaining > 0) return { allowed: true, remaining };
  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.ceil(msUntilNextLocalMidnight(now, cfg.timeZone) / 1000),
  };
}

/** Active-listing cap: simple count check (no time window). */
export function evaluateListingQuota(
  activeListingCount: number,
  cfg: QuotaConfig = DEFAULT_QUOTA,
): QuotaDecision {
  const remaining = Math.max(0, cfg.maxActiveListings - activeListingCount);
  return { allowed: remaining > 0, remaining };
}
