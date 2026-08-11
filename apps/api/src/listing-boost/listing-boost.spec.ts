/** EC-S-T26 — flat-fee + pause/resume + weight cap tests. */

import { describe, expect, it } from 'vitest';
import {
  BOOST_FLAT_PRICE_CENTS,
  BOOST_WEIGHT_ACTIVE,
  BOOST_WEIGHT_CAP,
  boostFlatPriceCents,
  clampBoostWeight,
  isBoostDurationDays,
  remainingBoostMs,
  resumeBoostEndsAt,
} from '@easycasa/shared';

describe('listing boost flat-fee (T04 row 8)', () => {
  it('only allows 7 and 30 day products with fixed cents', () => {
    expect(isBoostDurationDays(7)).toBe(true);
    expect(isBoostDurationDays(30)).toBe(true);
    expect(isBoostDurationDays(14)).toBe(false);
    expect(boostFlatPriceCents(7)).toBe(990);
    expect(boostFlatPriceCents(30)).toBe(2490);
    expect(BOOST_FLAT_PRICE_CENTS[7]).toBe(990);
    // Not derived from listing price — constants only.
    expect(Object.values(BOOST_FLAT_PRICE_CENTS).every((c) => c > 0)).toBe(true);
  });
});

describe('boost ranking weight', () => {
  it('caps boost weight so organic relevance survives', () => {
    expect(clampBoostWeight(BOOST_WEIGHT_ACTIVE)).toBe(BOOST_WEIGHT_ACTIVE);
    expect(clampBoostWeight(999)).toBe(BOOST_WEIGHT_CAP);
    expect(clampBoostWeight(0)).toBe(0);
    expect(BOOST_WEIGHT_ACTIVE).toBeLessThanOrEqual(BOOST_WEIGHT_CAP);
  });
});

describe('pause / resume remaining time', () => {
  const now = new Date('2026-08-11T12:00:00Z');
  it('preserves remaining ms on pause and resumes ends_at', () => {
    const ends = new Date('2026-08-18T12:00:00Z'); // 7d left
    const rem = remainingBoostMs(ends, now);
    expect(rem).toBe(7 * 86_400_000);
    expect(resumeBoostEndsAt(rem, now).toISOString()).toBe(ends.toISOString());
  });
});
