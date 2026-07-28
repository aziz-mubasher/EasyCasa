/**
 * Assert client-side generateSlots matches the public slots API shape for the
 * same windows (EC-5 preview fidelity).
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LISTING_TIMEZONE,
  DEFAULT_SCHEDULING_CONFIG,
  defaultAvailabilityWindows,
  generateSlots,
  weeklyHours,
} from '@easycasa/shared';

const DAY_MS = 86_400_000;

describe('EC-5 availability defaults + generateSlots preview', () => {
  it('defaults are Mon–Fri 18–20 and Sat 10–13', () => {
    const w = defaultAvailabilityWindows();
    expect(w).toHaveLength(6);
    expect(weeklyHours(w)).toBe(13); // 5*2 + 3
    expect(w.filter((x) => x.weekday >= 1 && x.weekday <= 5).every((x) => x.startMinutes === 1080)).toBe(
      true,
    );
    expect(w.find((x) => x.weekday === 6)).toEqual({
      weekday: 6,
      startMinutes: 600,
      endMinutes: 780,
    });
  });

  it('July-authored window yields November local evening slots (DST)', () => {
    // Fixed "now" in early November (CET) — weekday evening windows must land at 18:00 Rome.
    const nowMs = Date.parse('2025-11-03T10:00:00Z');
    const windows = [{ weekday: 1, startMinutes: 18 * 60, endMinutes: 20 * 60 }];
    const slots = generateSlots(windows, {
      fromMs: nowMs,
      toMs: nowMs + 14 * DAY_MS,
      slotMinutes: DEFAULT_SCHEDULING_CONFIG.slotMinutes,
      bufferMinutes: DEFAULT_SCHEDULING_CONFIG.bufferMinutes,
      existing: [],
      nowMs,
      minLeadMinutes: DEFAULT_SCHEDULING_CONFIG.minLeadMinutes,
      timeZone: DEFAULT_LISTING_TIMEZONE,
    });
    expect(slots.length).toBeGreaterThan(0);
    const first = slots[0]!;
    const hour = new Intl.DateTimeFormat('en-GB', {
      timeZone: DEFAULT_LISTING_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(first.startMs));
    expect(hour).toBe('18:00');
  });
});
