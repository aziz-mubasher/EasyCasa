/** EC-S 429 interceptor — quota logic tests, incl. Europe/Rome DST edges.
 * EU DST 2026: spring forward Sun 29 Mar (02:00→03:00 CET→CEST, 23h day);
 * fall back Sun 25 Oct (03:00→02:00 CEST→CET, 25h day). */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_QUOTA,
  localDayKey,
  msUntilNextLocalMidnight,
  evaluateUploadQuota,
  evaluateListingQuota,
} from '@easycasa/shared';

const ROME = 'Europe/Rome';
const cfg = { ...DEFAULT_QUOTA, maxUploadsPerDay: 3 };

describe('localDayKey', () => {
  it('buckets by Rome local day, not UTC', () => {
    expect(localDayKey(new Date('2026-06-10T22:30:00Z'), ROME)).toBe('2026-06-11');
    expect(localDayKey(new Date('2026-06-10T22:30:00Z'), 'UTC')).toBe('2026-06-10');
  });

  it('winter (CET, +1): 23:30 UTC is next Rome day', () => {
    expect(localDayKey(new Date('2026-01-10T23:30:00Z'), ROME)).toBe('2026-01-11');
    expect(localDayKey(new Date('2026-01-10T22:30:00Z'), ROME)).toBe('2026-01-10');
  });
});

describe('msUntilNextLocalMidnight — DST safety', () => {
  it('normal day: boundary at Rome midnight, ~sub-24h', () => {
    const now = new Date('2026-06-10T12:00:00Z');
    const ms = msUntilNextLocalMidnight(now, ROME);
    expect(ms).toBe(new Date('2026-06-10T22:00:00Z').getTime() - now.getTime());
  });

  it('spring-forward day (29 Mar 2026, 23h): still lands exactly on day-key change', () => {
    const now = new Date('2026-03-29T00:30:00Z');
    const ms = msUntilNextLocalMidnight(now, ROME);
    const boundary = new Date(now.getTime() + ms);
    expect(localDayKey(new Date(boundary.getTime() - 1), ROME)).toBe('2026-03-29');
    expect(localDayKey(boundary, ROME)).toBe('2026-03-30');
    expect(boundary.toISOString()).toBe('2026-03-29T22:00:00.000Z');
  });

  it('fall-back day (25 Oct 2026, 25h): boundary exact, > 24h span works', () => {
    const now = new Date('2026-10-25T00:10:00Z');
    const ms = msUntilNextLocalMidnight(now, ROME);
    const boundary = new Date(now.getTime() + ms);
    expect(boundary.toISOString()).toBe('2026-10-25T23:00:00.000Z');
    expect(localDayKey(boundary, ROME)).toBe('2026-10-26');
  });
});

describe('evaluateUploadQuota', () => {
  it('allows under the cap and reports remaining', () => {
    const now = new Date('2026-06-11T10:00:00Z');
    const prior = [new Date('2026-06-11T08:00:00Z')];
    const d = evaluateUploadQuota(now, prior, cfg);
    expect(d.allowed).toBe(true);
    expect(d.remaining).toBe(2);
  });

  it('denies at the cap with retryAfter until Rome midnight', () => {
    const now = new Date('2026-06-11T10:00:00Z');
    const prior = [1, 2, 3].map((h) => new Date(`2026-06-11T0${h}:00:00Z`));
    const d = evaluateUploadQuota(now, prior, cfg);
    expect(d.allowed).toBe(false);
    expect(d.remaining).toBe(0);
    expect(d.retryAfterSeconds).toBe(12 * 3600);
  });

  it("yesterday's uploads don't count (Rome boundary, not rolling 24h)", () => {
    const now = new Date('2026-06-11T22:30:00Z');
    const prior = [
      new Date('2026-06-11T20:00:00Z'),
      new Date('2026-06-11T21:00:00Z'),
      new Date('2026-06-11T21:30:00Z'),
    ];
    const d = evaluateUploadQuota(now, prior, cfg);
    expect(d.allowed).toBe(true);
    expect(d.remaining).toBe(3);
  });

  it('cap of zero always denies with a sane retryAfter', () => {
    const d = evaluateUploadQuota(new Date('2026-06-11T10:00:00Z'), [], {
      ...cfg,
      maxUploadsPerDay: 0,
    });
    expect(d.allowed).toBe(false);
    expect(d.retryAfterSeconds).toBeGreaterThan(0);
    expect(d.retryAfterSeconds!).toBeLessThanOrEqual(25 * 3600);
  });
});

describe('evaluateListingQuota', () => {
  it('caps active listings at the configured max', () => {
    expect(evaluateListingQuota(4, DEFAULT_QUOTA)).toEqual({ allowed: true, remaining: 1 });
    expect(evaluateListingQuota(5, DEFAULT_QUOTA)).toEqual({ allowed: false, remaining: 0 });
  });
});
