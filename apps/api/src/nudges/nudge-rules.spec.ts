/** EC-S-T24 — nudgeRules from @easycasa/shared (shared package has no vitest). */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NUDGE_CONFIG,
  evaluateNudges,
  isNudgeCode,
  NUDGE_CODES,
  type NudgeHistoryEntry,
  type NudgeMetrics,
} from '@easycasa/shared';

const NOW = new Date('2026-08-11T12:00:00.000Z');

function metrics(partial: Partial<NudgeMetrics>): NudgeMetrics {
  return {
    views: null,
    enquiryRate: null,
    daysOnMarket: null,
    priceVsOmiBandPct: null,
    ...partial,
  };
}

describe('evaluateNudges — thresholds', () => {
  it('LOW_ENQUIRY_RATE fires below threshold with enough views', () => {
    const codes = evaluateNudges(
      metrics({ views: 100, enquiryRate: 0.01 }),
      [],
      NOW,
    );
    expect(codes).toContain('LOW_ENQUIRY_RATE');
  });

  it('LOW_ENQUIRY_RATE does not fire at/above threshold', () => {
    expect(
      evaluateNudges(metrics({ views: 100, enquiryRate: 0.02 }), [], NOW),
    ).not.toContain('LOW_ENQUIRY_RATE');
    expect(
      evaluateNudges(metrics({ views: 100, enquiryRate: 0.05 }), [], NOW),
    ).not.toContain('LOW_ENQUIRY_RATE');
  });

  it('LOW_ENQUIRY_RATE requires minViewsForEnquiryRate', () => {
    expect(
      evaluateNudges(metrics({ views: 49, enquiryRate: 0 }), [], NOW),
    ).not.toContain('LOW_ENQUIRY_RATE');
    expect(
      evaluateNudges(metrics({ views: 50, enquiryRate: 0 }), [], NOW),
    ).toContain('LOW_ENQUIRY_RATE');
  });

  it('ABOVE_OMI_BAND / BELOW_OMI_BAND use ±omiBandDeviationPct (T09-aligned 20)', () => {
    expect(DEFAULT_NUDGE_CONFIG.omiBandDeviationPct).toBe(20);
    expect(
      evaluateNudges(metrics({ priceVsOmiBandPct: 20.1 }), [], NOW),
    ).toEqual(['ABOVE_OMI_BAND']);
    expect(
      evaluateNudges(metrics({ priceVsOmiBandPct: 20 }), [], NOW),
    ).toEqual([]);
    expect(
      evaluateNudges(metrics({ priceVsOmiBandPct: -20.1 }), [], NOW),
    ).toEqual(['BELOW_OMI_BAND']);
    expect(
      evaluateNudges(metrics({ priceVsOmiBandPct: -20 }), [], NOW),
    ).toEqual([]);
    expect(
      evaluateNudges(metrics({ priceVsOmiBandPct: 5 }), [], NOW),
    ).toEqual([]);
  });

  it('LONG_ON_MARKET fires at longOnMarketDays', () => {
    expect(
      evaluateNudges(metrics({ daysOnMarket: 59 }), [], NOW),
    ).not.toContain('LONG_ON_MARKET');
    expect(
      evaluateNudges(metrics({ daysOnMarket: 60 }), [], NOW),
    ).toContain('LONG_ON_MARKET');
  });

  it('STALE_NO_VIEWS requires zero views and staleNoViewsDays on market', () => {
    expect(
      evaluateNudges(metrics({ views: 0, daysOnMarket: 6 }), [], NOW),
    ).not.toContain('STALE_NO_VIEWS');
    expect(
      evaluateNudges(metrics({ views: 0, daysOnMarket: 7 }), [], NOW),
    ).toContain('STALE_NO_VIEWS');
    expect(
      evaluateNudges(metrics({ views: 1, daysOnMarket: 30 }), [], NOW),
    ).not.toContain('STALE_NO_VIEWS');
  });
});

describe('evaluateNudges — missing-data safety', () => {
  it('skips OMI codes when priceVsOmiBandPct is null', () => {
    expect(
      evaluateNudges(metrics({ priceVsOmiBandPct: null, daysOnMarket: 90 }), [], NOW),
    ).not.toEqual(expect.arrayContaining(['ABOVE_OMI_BAND', 'BELOW_OMI_BAND']));
  });

  it('skips view-dependent codes when views/enquiryRate unknown', () => {
    const codes = evaluateNudges(
      metrics({ views: null, enquiryRate: null, daysOnMarket: 90 }),
      [],
      NOW,
    );
    expect(codes).not.toContain('LOW_ENQUIRY_RATE');
    expect(codes).not.toContain('STALE_NO_VIEWS');
    expect(codes).toContain('LONG_ON_MARKET');
  });

  it('skips LONG_ON_MARKET / STALE when daysOnMarket is null', () => {
    const codes = evaluateNudges(
      metrics({ views: 0, daysOnMarket: null }),
      [],
      NOW,
    );
    expect(codes).not.toContain('LONG_ON_MARKET');
    expect(codes).not.toContain('STALE_NO_VIEWS');
  });
});

describe('evaluateNudges — cooldowns', () => {
  it('suppresses a code emitted inside cooldownDays', () => {
    const history: NudgeHistoryEntry[] = [
      {
        code: 'ABOVE_OMI_BAND',
        emittedAt: new Date('2026-08-01T12:00:00.000Z'), // 10 days ago
      },
    ];
    expect(
      evaluateNudges(metrics({ priceVsOmiBandPct: 35 }), history, NOW),
    ).not.toContain('ABOVE_OMI_BAND');
  });

  it('allows re-emit after cooldownDays', () => {
    const history: NudgeHistoryEntry[] = [
      {
        code: 'ABOVE_OMI_BAND',
        emittedAt: new Date('2026-07-20T12:00:00.000Z'), // 22 days ago
      },
    ];
    expect(
      evaluateNudges(metrics({ priceVsOmiBandPct: 35 }), history, NOW),
    ).toContain('ABOVE_OMI_BAND');
  });

  it('cooldown is per-code (other codes still fire)', () => {
    const history: NudgeHistoryEntry[] = [
      {
        code: 'LONG_ON_MARKET',
        emittedAt: new Date('2026-08-05T12:00:00.000Z'),
      },
    ];
    const codes = evaluateNudges(
      metrics({ priceVsOmiBandPct: 40, daysOnMarket: 90 }),
      history,
      NOW,
    );
    expect(codes).toContain('ABOVE_OMI_BAND');
    expect(codes).not.toContain('LONG_ON_MARKET');
  });
});

describe('evaluateNudges — codes-only', () => {
  it('returns only known NudgeCode values in NUDGE_CODES order', () => {
    const codes = evaluateNudges(
      metrics({
        views: 0,
        enquiryRate: 0,
        daysOnMarket: 90,
        priceVsOmiBandPct: 40,
      }),
      [],
      NOW,
    );
    expect(codes.every(isNudgeCode)).toBe(true);
    expect(codes).toEqual([
      'ABOVE_OMI_BAND',
      'LONG_ON_MARKET',
      'STALE_NO_VIEWS',
    ]);
    // LOW_ENQUIRY skipped: views < minViewsForEnquiryRate
    expect(NUDGE_CODES).toEqual([
      'LOW_ENQUIRY_RATE',
      'ABOVE_OMI_BAND',
      'BELOW_OMI_BAND',
      'LONG_ON_MARKET',
      'STALE_NO_VIEWS',
    ]);
  });
});
