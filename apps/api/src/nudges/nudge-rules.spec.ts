/** EC-S-T24 — nudge rule tests: thresholds, missing-data safety, cooldowns, codes-only output. */

import { describe, it, expect } from 'vitest';
import {
  evaluateNudges,
  DEFAULT_NUDGE_CONFIG,
  type ListingMetrics,
  type NudgeCode,
} from '@easycasa/shared';

const NOW = new Date('2026-08-11T12:00:00Z');
const NO_HISTORY = new Map<NudgeCode, Date>();

const quiet: ListingMetrics = { daysOnMarket: 10, views30d: 100, enquiries30d: 3 };

describe('rule thresholds', () => {
  it('healthy listing produces no nudges', () => {
    expect(evaluateNudges(quiet, NO_HISTORY, NOW)).toEqual([]);
  });

  it('LOW_ENQUIRY_RATE requires the view floor', () => {
    const m = { ...quiet, views30d: 199, enquiries30d: 0 };
    expect(evaluateNudges(m, NO_HISTORY, NOW)).toEqual([]); // below floor: no judgment on thin data
    const m2 = { ...quiet, views30d: 400, enquiries30d: 2 }; // 0.5%
    expect(evaluateNudges(m2, NO_HISTORY, NOW)).toEqual([
      { code: 'LOW_ENQUIRY_RATE', data: { views: 400, enquiries: 2 } },
    ]);
  });

  it('band nudges fire both directions at ±20 and round pct', () => {
    expect(evaluateNudges({ ...quiet, priceVsOmiBandPct: 23.6 }, NO_HISTORY, NOW)).toEqual([
      { code: 'ABOVE_OMI_BAND', data: { pct: 24 } },
    ]);
    expect(evaluateNudges({ ...quiet, priceVsOmiBandPct: -25.2 }, NO_HISTORY, NOW)).toEqual([
      { code: 'BELOW_OMI_BAND', data: { pct: 25 } },
    ]);
    expect(evaluateNudges({ ...quiet, priceVsOmiBandPct: 19.9 }, NO_HISTORY, NOW)).toEqual([]);
  });

  it('no OMI data ⇒ no band nudge (never guesses)', () => {
    expect(evaluateNudges({ ...quiet, priceVsOmiBandPct: undefined }, NO_HISTORY, NOW)).toEqual([]);
  });

  it('LONG_ON_MARKET vs zone median × factor; silent without zone data', () => {
    const m = { ...quiet, daysOnMarket: 90, zoneMedianDaysOnMarket: 60 };
    expect(evaluateNudges(m, NO_HISTORY, NOW)).toEqual([
      { code: 'LONG_ON_MARKET', data: { days: 90, zoneMedian: 60 } },
    ]);
    expect(
      evaluateNudges({ ...quiet, daysOnMarket: 89, zoneMedianDaysOnMarket: 60 }, NO_HISTORY, NOW),
    ).toEqual([]);
    expect(
      evaluateNudges({ ...quiet, daysOnMarket: 500 }, NO_HISTORY, NOW).map((n) => n.code),
    ).not.toContain('LONG_ON_MARKET');
  });

  it('STALE_NO_VIEWS needs both age and low views', () => {
    expect(evaluateNudges({ daysOnMarket: 30, views30d: 10, enquiries30d: 0 }, NO_HISTORY, NOW)).toEqual(
      [{ code: 'STALE_NO_VIEWS', data: { days: 30, views: 10 } }],
    );
    expect(
      evaluateNudges({ daysOnMarket: 30, views30d: 80, enquiries30d: 0 }, NO_HISTORY, NOW),
    ).toEqual([]);
  });
});

describe('cooldown', () => {
  const m: ListingMetrics = { ...quiet, priceVsOmiBandPct: 30 };

  it('suppresses a recently shown code', () => {
    const history = new Map<NudgeCode, Date>([
      ['ABOVE_OMI_BAND', new Date('2026-08-01T12:00:00Z')],
    ]); // 10d ago
    expect(evaluateNudges(m, history, NOW)).toEqual([]);
  });

  it('re-emits after cooldownDays', () => {
    const history = new Map<NudgeCode, Date>([
      ['ABOVE_OMI_BAND', new Date('2026-07-25T12:00:00Z')],
    ]); // 17d ago
    expect(evaluateNudges(m, history, NOW).map((n) => n.code)).toEqual(['ABOVE_OMI_BAND']);
  });

  it('cooldown is per-code, not global', () => {
    const both: ListingMetrics = {
      daysOnMarket: 30,
      views30d: 10,
      enquiries30d: 0,
      priceVsOmiBandPct: 30,
    };
    const history = new Map<NudgeCode, Date>([
      ['ABOVE_OMI_BAND', new Date('2026-08-10T12:00:00Z')],
    ]);
    expect(evaluateNudges(both, history, NOW).map((n) => n.code)).toEqual(['STALE_NO_VIEWS']);
  });
});

describe('row-3 structural compliance', () => {
  it('output contains codes and numbers only — no strings anywhere in data', () => {
    const noisy: ListingMetrics = {
      daysOnMarket: 120,
      views30d: 1000,
      enquiries30d: 1,
      priceVsOmiBandPct: 35,
      zoneMedianDaysOnMarket: 40,
    };
    const nudges = evaluateNudges(noisy, NO_HISTORY, NOW);
    expect(nudges.length).toBeGreaterThan(0);
    for (const n of nudges) {
      for (const v of Object.values(n.data)) expect(typeof v).toBe('number');
    }
  });

  it('config defaults align with the T09 chip threshold (20%)', () => {
    expect(DEFAULT_NUDGE_CONFIG.bandDeviationPct).toBe(20);
  });
});
