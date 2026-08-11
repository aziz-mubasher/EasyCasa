/**
 * EC-S-T24 — seller price-adjustment nudges (@easycasa/shared).
 *
 * Pure observation rules for the seller dashboard. Output is **codes only**
 * (i18n lives in the web app). Phrasing must stay observation-only (T04 row 3):
 * no advice / CTA verbs.
 *
 * Cool-down history is persisted in `listing_nudges` (migration 0058); this
 * module only evaluates against an in-memory history slice.
 *
 * Metrics shape mirrors T23 `SellerListingAnalytics` fields. Missing optional
 * inputs must not invent signals (fail-soft / skip the dependent code).
 */

export const NUDGE_CODES = [
  'LOW_ENQUIRY_RATE',
  'ABOVE_OMI_BAND',
  'BELOW_OMI_BAND',
  'LONG_ON_MARKET',
  'STALE_NO_VIEWS',
] as const;

export type NudgeCode = (typeof NUDGE_CODES)[number];

export function isNudgeCode(raw: string): raw is NudgeCode {
  return (NUDGE_CODES as readonly string[]).includes(raw);
}

export type NudgeConfig = {
  /** Min views before LOW_ENQUIRY_RATE may fire (noise floor). */
  minViewsForEnquiryRate: number;
  /** Fire when enquiryRate is strictly below this (e.g. 0.02 = 2%). */
  lowEnquiryRateThreshold: number;
  /**
   * |priceVsOmiBandPct| strictly above this → ABOVE / BELOW.
   * Aligned with T09 OMI panel ±20% band kind.
   */
  omiBandDeviationPct: number;
  /** Fire LONG_ON_MARKET when daysOnMarket >= this. */
  longOnMarketDays: number;
  /** Fire STALE_NO_VIEWS when daysOnMarket >= this and views === 0. */
  staleNoViewsDays: number;
  /** Suppress re-emit of the same code within this many whole days. */
  cooldownDays: number;
};

export const DEFAULT_NUDGE_CONFIG: NudgeConfig = {
  minViewsForEnquiryRate: 50,
  lowEnquiryRateThreshold: 0.02,
  omiBandDeviationPct: 20,
  longOnMarketDays: 60,
  staleNoViewsDays: 7,
  cooldownDays: 14,
};

/**
 * Inputs for rule evaluation. Optional / null fields mean "unknown" —
 * dependent codes must not fire (missing-data safety).
 */
export type NudgeMetrics = {
  /** Windowed views; null = analytics not available yet (e.g. pre-T23). */
  views: number | null;
  /** enquiries / views in the same window; null when views unknown. */
  enquiryRate: number | null;
  /** Whole days since sticky first publish; null when never published. */
  daysOnMarket: number | null;
  /** Asking vs OMI midpoint %; null when zone/price/size/band unresolved. */
  priceVsOmiBandPct: number | null;
};

export type NudgeHistoryEntry = {
  code: NudgeCode;
  emittedAt: Date;
};

const DAY_MS = 86_400_000;

function inCooldown(
  code: NudgeCode,
  history: readonly NudgeHistoryEntry[],
  now: Date,
  cooldownDays: number,
): boolean {
  if (cooldownDays <= 0) return false;
  const cutoff = now.getTime() - cooldownDays * DAY_MS;
  for (const h of history) {
    if (h.code === code && h.emittedAt.getTime() >= cutoff) return true;
  }
  return false;
}

/**
 * Evaluate which nudge codes apply. Returns codes only (stable order =
 * NUDGE_CODES). Cool-down and missing-data gates are applied here.
 */
export function evaluateNudges(
  metrics: NudgeMetrics,
  history: readonly NudgeHistoryEntry[] = [],
  now: Date = new Date(),
  cfg: NudgeConfig = DEFAULT_NUDGE_CONFIG,
): NudgeCode[] {
  const out: NudgeCode[] = [];

  const maybePush = (code: NudgeCode, eligible: boolean): void => {
    if (!eligible) return;
    if (inCooldown(code, history, now, cfg.cooldownDays)) return;
    out.push(code);
  };

  const views = metrics.views;
  const rate = metrics.enquiryRate;
  if (
    views != null &&
    rate != null &&
    views >= cfg.minViewsForEnquiryRate &&
    rate < cfg.lowEnquiryRateThreshold
  ) {
    maybePush('LOW_ENQUIRY_RATE', true);
  }

  const pct = metrics.priceVsOmiBandPct;
  if (pct != null && Number.isFinite(pct)) {
    maybePush('ABOVE_OMI_BAND', pct > cfg.omiBandDeviationPct);
    maybePush('BELOW_OMI_BAND', pct < -cfg.omiBandDeviationPct);
  }

  const dom = metrics.daysOnMarket;
  if (dom != null && Number.isFinite(dom)) {
    maybePush('LONG_ON_MARKET', dom >= cfg.longOnMarketDays);
    maybePush(
      'STALE_NO_VIEWS',
      views != null && views === 0 && dom >= cfg.staleNoViewsDays,
    );
  }

  return out;
}
