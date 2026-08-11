/**
 * EC-S-T23 — seller listing analytics aggregates (own-listing metrics only).
 * Observations for the seller dashboard; no advice / recommendation verbs.
 */

export type SellerAnalyticsWindow = '7d' | '30d' | '90d' | '365d';

export type SellerListingAnalytics = {
  views: number;
  saves: number;
  enquiries: number;
  /** enquiries / views; 0 when views === 0. */
  enquiryRate: number;
  /** Whole days since sticky first_published_at; 0 when never published. */
  daysOnMarket: number;
  /**
   * Asking price deviation vs OMI band midpoint (%).
   * Omit when zone/price/size/band cannot be resolved (do not guess).
   */
  priceVsOmiBandPct?: number;
  /**
   * Zone median days-on-market. Omit when no data source (T23: always omit).
   */
  zoneMedianDaysOnMarket?: number;
  /** Daily view series for sparklines (same window). */
  series?: Array<{ day: string; views: number }>;
};

export function parseAnalyticsWindow(raw: string | undefined | null): SellerAnalyticsWindow {
  if (raw === '7d' || raw === '90d' || raw === '365d') return raw;
  return '30d';
}

/**
 * Clamp a requested window to the seller's entitlement max (days).
 * Free stays at the pre-T27 max of 90 (7d/30d/90d); premium 365 — never
 * expand beyond entitlement.
 */
export function clampAnalyticsWindow(
  requested: SellerAnalyticsWindow,
  maxDays: number,
): SellerAnalyticsWindow {
  const days = windowDayCount(requested);
  if (days <= maxDays) return requested;
  if (maxDays >= 365) return '365d';
  if (maxDays >= 90) return '90d';
  if (maxDays >= 30) return '30d';
  return '7d';
}

export function windowDayCount(window: SellerAnalyticsWindow): number {
  if (window === '7d') return 7;
  if (window === '90d') return 90;
  if (window === '365d') return 365;
  return 30;
}

/** UTC calendar day string (YYYY-MM-DD) for `now`, floored. */
export function utcDayString(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Inclusive window start as UTC midnight Date (start of day N days before endDay). */
export function windowStartDate(endDay: string, days: number): Date {
  const end = new Date(`${endDay}T00:00:00.000Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
}

export function enquiryRate(enquiries: number, views: number): number {
  if (!(views > 0)) return 0;
  return enquiries / views;
}

/**
 * Assemble the public DTO. Optional fields are omitted (not null) when absent.
 */
export function buildSellerListingAnalytics(input: {
  views: number;
  saves: number;
  enquiries: number;
  daysOnMarket: number;
  priceVsOmiBandPct?: number | null;
  zoneMedianDaysOnMarket?: number | null;
  series?: Array<{ day: string; views: number }>;
}): SellerListingAnalytics {
  const out: SellerListingAnalytics = {
    views: Math.max(0, Math.floor(input.views)),
    saves: Math.max(0, Math.floor(input.saves)),
    enquiries: Math.max(0, Math.floor(input.enquiries)),
    enquiryRate: enquiryRate(input.enquiries, input.views),
    daysOnMarket: Math.max(0, Math.floor(input.daysOnMarket)),
  };
  if (
    input.priceVsOmiBandPct != null &&
    Number.isFinite(input.priceVsOmiBandPct)
  ) {
    out.priceVsOmiBandPct = input.priceVsOmiBandPct;
  }
  if (
    input.zoneMedianDaysOnMarket != null &&
    Number.isFinite(input.zoneMedianDaysOnMarket)
  ) {
    out.zoneMedianDaysOnMarket = input.zoneMedianDaysOnMarket;
  }
  if (input.series && input.series.length > 0) {
    out.series = input.series;
  }
  return out;
}
