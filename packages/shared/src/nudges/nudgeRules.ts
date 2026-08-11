/**
 * EC-S-T24 — Price/performance nudge rules (@easycasa/shared).
 *
 * T04 matrix row 3 COMPLIANCE BY CONSTRUCTION: this module emits CODES with
 * numeric payloads only. It cannot produce prose, so no code path can generate
 * advice. Copy lives exclusively in reviewed i18n message keys
 * (`nudges.{code}`), which must phrase observations, never recommendations —
 * the existing forbidden-token CI grep extends to those keys.
 *
 * Decision authority stays with the seller: nudges are informational cards,
 * dismissible, with no accept/apply action.
 */

export type NudgeCode =
  | 'LOW_ENQUIRY_RATE' // views high, enquiries low
  | 'ABOVE_OMI_BAND' // asking €/m² above zone band by threshold
  | 'BELOW_OMI_BAND' // symmetric — sellers may be leaving money unseen
  | 'LONG_ON_MARKET' // daysOnMarket well past zone median
  | 'STALE_NO_VIEWS'; // listing live but effectively unseen

export const NUDGE_CODES: readonly NudgeCode[] = [
  'LOW_ENQUIRY_RATE',
  'ABOVE_OMI_BAND',
  'BELOW_OMI_BAND',
  'LONG_ON_MARKET',
  'STALE_NO_VIEWS',
] as const;

export function isNudgeCode(raw: string): raw is NudgeCode {
  return (NUDGE_CODES as readonly string[]).includes(raw);
}

export interface ListingMetrics {
  daysOnMarket: number; // sticky first-publish basis (T13)
  views30d: number;
  enquiries30d: number;
  /** Asking €/m² deviation from OMI band midpoint, percent (signed). Absent when zone has no band. */
  priceVsOmiBandPct?: number;
  /** Zone median days-on-market. Absent when insufficient zone data. */
  zoneMedianDaysOnMarket?: number;
}

export interface NudgeConfig {
  minViewsForRateNudge: number; // default 200
  maxEnquiryRate: number; // default 0.01 (1 enquiry per 100 views)
  bandDeviationPct: number; // default 20 (matches T09 chip threshold)
  longOnMarketFactor: number; // default 1.5 × zone median
  staleMinDays: number; // default 21
  staleMaxViews: number; // default 25
  cooldownDays: number; // default 14 per code
}

export const DEFAULT_NUDGE_CONFIG: NudgeConfig = {
  minViewsForRateNudge: 200,
  maxEnquiryRate: 0.01,
  bandDeviationPct: 20,
  longOnMarketFactor: 1.5,
  staleMinDays: 21,
  staleMaxViews: 25,
  cooldownDays: 14,
};

export interface Nudge {
  code: NudgeCode;
  /** Numeric payload for i18n interpolation — never prose. */
  data: Record<string, number>;
}

/** Last time each code was shown for this listing (persisted; empty map = never). */
export type NudgeHistory = ReadonlyMap<NudgeCode, Date>;

function offCooldown(
  code: NudgeCode,
  history: NudgeHistory,
  now: Date,
  cooldownDays: number,
): boolean {
  const last = history.get(code);
  if (!last) return true;
  return now.getTime() - last.getTime() >= cooldownDays * 86_400_000;
}

/** Evaluate all rules. Deterministic order; each rule independent. */
export function evaluateNudges(
  m: ListingMetrics,
  history: NudgeHistory,
  now: Date,
  cfg: NudgeConfig = DEFAULT_NUDGE_CONFIG,
): Nudge[] {
  const out: Nudge[] = [];
  const push = (code: NudgeCode, data: Record<string, number>) => {
    if (offCooldown(code, history, now, cfg.cooldownDays)) out.push({ code, data });
  };

  if (m.views30d >= cfg.minViewsForRateNudge) {
    const rate = m.enquiries30d / m.views30d;
    if (rate < cfg.maxEnquiryRate) {
      push('LOW_ENQUIRY_RATE', { views: m.views30d, enquiries: m.enquiries30d });
    }
  }

  if (m.priceVsOmiBandPct !== undefined) {
    if (m.priceVsOmiBandPct >= cfg.bandDeviationPct) {
      push('ABOVE_OMI_BAND', { pct: Math.round(m.priceVsOmiBandPct) });
    } else if (m.priceVsOmiBandPct <= -cfg.bandDeviationPct) {
      push('BELOW_OMI_BAND', { pct: Math.round(Math.abs(m.priceVsOmiBandPct)) });
    }
  }

  if (m.zoneMedianDaysOnMarket !== undefined && m.zoneMedianDaysOnMarket > 0) {
    if (m.daysOnMarket >= m.zoneMedianDaysOnMarket * cfg.longOnMarketFactor) {
      push('LONG_ON_MARKET', {
        days: m.daysOnMarket,
        zoneMedian: m.zoneMedianDaysOnMarket,
      });
    }
  }

  if (m.daysOnMarket >= cfg.staleMinDays && m.views30d <= cfg.staleMaxViews) {
    push('STALE_NO_VIEWS', { days: m.daysOnMarket, views: m.views30d });
  }

  return out;
}
