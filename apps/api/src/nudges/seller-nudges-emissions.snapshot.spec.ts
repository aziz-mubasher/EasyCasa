/**
 * EC-S Phase 4 PR-1 — T24 job emission snapshot.
 *
 * After injecting SellerAnalyticsService for view rollups, evaluateNudges must
 * still emit the same codes/payloads for a fixed ListingMetrics fixture
 * (identical emissions before/after the refactor).
 */

import { describe, expect, it } from 'vitest';
import {
  evaluateNudges,
  type ListingMetrics,
  type NudgeCode,
} from '@easycasa/shared';

const NOW = new Date('2026-08-11T12:00:00Z');
const NO_HISTORY = new Map<NudgeCode, Date>();

/**
 * Metrics shape as produced by SellerNudgesService.loadMetrics when T23
 * rollups return views via SellerAnalyticsService.sumViewsInWindowFailSoft.
 */
const FIXTURE_METRICS: ListingMetrics = {
  daysOnMarket: 120,
  views30d: 1000,
  enquiries30d: 1,
  priceVsOmiBandPct: 35,
  zoneMedianDaysOnMarket: 40,
};

/** Golden emissions — do not change unless product thresholds change. */
const EXPECTED_EMISSIONS = [
  { code: 'LOW_ENQUIRY_RATE', data: { views: 1000, enquiries: 1 } },
  { code: 'ABOVE_OMI_BAND', data: { pct: 35 } },
  { code: 'LONG_ON_MARKET', data: { days: 120, zoneMedian: 40 } },
] as const;

describe('T24 nudge job emissions snapshot (PR-1 analytics injection)', () => {
  it('evaluateNudges matches golden fixture (identical before/after refactor)', () => {
    const emitted = evaluateNudges(FIXTURE_METRICS, NO_HISTORY, NOW);
    expect(emitted).toEqual([...EXPECTED_EMISSIONS]);
  });

  it('healthy listing with analytics-sourced low views stays silent', () => {
    const healthy: ListingMetrics = {
      daysOnMarket: 10,
      views30d: 100,
      enquiries30d: 3,
    };
    expect(evaluateNudges(healthy, NO_HISTORY, NOW)).toEqual([]);
  });
});
