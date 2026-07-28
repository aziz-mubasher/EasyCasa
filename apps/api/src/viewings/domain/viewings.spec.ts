import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, validateBooking, withinAnyWindow } from './booking';
import { overlaps } from './intervals';
import { nextViewingStatus, ViewingTransitionError } from './ports';
import { generateSlots } from './slots';
import type { AvailabilityWindow, Slot } from './types';
import { localWallToUtcMs } from './zoned-time';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const TZ = 'Europe/Rome';
/** Wed 2026-06-03 08:00Z — CEST week. */
const NOW = Date.UTC(2026, 5, 3, 8, 0, 0);
/** Saturday 09:00–12:00 Europe/Rome wall-clock. */
const satWindow: AvailabilityWindow = { weekday: 6, startMinutes: 540, endMinutes: 720 };

/** Sat 2026-06-06 09:00 Europe/Rome = 07:00Z (CEST). */
function nextSaturday9Rome(): number {
  return localWallToUtcMs({ year: 2026, month: 6, day: 6 }, 540, TZ)!;
}

describe('viewing intervals', () => {
  it('overlaps respects the buffer', () => {
    const a: Slot = { startMs: 0, endMs: HOUR };
    expect(overlaps(a, { startMs: HOUR + 10 * MIN, endMs: 2 * HOUR }, 0)).toBe(false);
    expect(overlaps(a, { startMs: HOUR + 10 * MIN, endMs: 2 * HOUR }, 15 * MIN)).toBe(true);
  });
});

describe('slot generation (Europe/Rome wall-clock)', () => {
  it('Saturday 09:00 Rome → 07:00Z in summer (CEST)', () => {
    const slots = generateSlots([satWindow], {
      fromMs: NOW,
      toMs: NOW + 7 * DAY,
      slotMinutes: 45,
      bufferMinutes: 15,
      existing: [],
      nowMs: NOW,
      minLeadMinutes: 120,
      timeZone: TZ,
    });
    expect(slots.length).toBe(4);
    expect(slots[0]?.startMs).toBe(nextSaturday9Rome());
    expect(slots[0]?.startMs).toBe(Date.UTC(2026, 5, 6, 7, 0, 0));
  });

  it('Saturday 09:00 Rome → 08:00Z in winter (CET)', () => {
    const winterNow = Date.UTC(2026, 0, 7, 8, 0, 0); // Wed Jan 7
    const winterSat = localWallToUtcMs({ year: 2026, month: 1, day: 10 }, 540, TZ)!;
    const slots = generateSlots([satWindow], {
      fromMs: winterNow,
      toMs: winterNow + 7 * DAY,
      slotMinutes: 45,
      bufferMinutes: 15,
      existing: [],
      nowMs: winterNow,
      minLeadMinutes: 120,
      timeZone: TZ,
    });
    expect(slots[0]?.startMs).toBe(winterSat);
    expect(slots[0]?.startMs).toBe(Date.UTC(2026, 0, 10, 8, 0, 0));
  });

  it('excludes slots that conflict with an existing booking (buffer)', () => {
    const existing: Slot[] = [
      { startMs: nextSaturday9Rome(), endMs: nextSaturday9Rome() + 45 * MIN },
    ];
    const slots = generateSlots([satWindow], {
      fromMs: NOW,
      toMs: NOW + 7 * DAY,
      slotMinutes: 45,
      bufferMinutes: 15,
      existing,
      nowMs: NOW,
      minLeadMinutes: 120,
      timeZone: TZ,
    });
    expect(slots.every((s) => s.startMs >= nextSaturday9Rome() + 45 * MIN)).toBe(true);
    expect(slots.length).toBeLessThan(4);
  });

  it('excludes past / too-soon slots via lead time', () => {
    const sat0910 = nextSaturday9Rome() + 10 * MIN;
    const earliest = sat0910 + 120 * MIN;
    const slots = generateSlots([satWindow], {
      fromMs: sat0910 - HOUR,
      toMs: sat0910 + 3 * HOUR,
      slotMinutes: 45,
      bufferMinutes: 15,
      existing: [],
      nowMs: sat0910,
      minLeadMinutes: 120,
      timeZone: TZ,
    });
    expect(slots.every((s) => s.startMs >= earliest)).toBe(true);
    expect(slots.length).toBe(1);
  });

  it('DST spring-forward: skips nonexistent local times (2026-03-29 02:xx Rome)', () => {
    // Italy springs forward 2026-03-29 02:00 → 03:00. Window 01:00–04:00 local.
    const window: AvailabilityWindow = { weekday: 0, startMinutes: 60, endMinutes: 240 };
    const from = Date.UTC(2026, 2, 28, 0, 0, 0);
    const to = Date.UTC(2026, 2, 30, 0, 0, 0);
    const slots = generateSlots([window], {
      fromMs: from,
      toMs: to,
      slotMinutes: 45,
      bufferMinutes: 0,
      existing: [],
      nowMs: from,
      minLeadMinutes: 0,
      timeZone: TZ,
    });
    // No slot whose local wall time is in the 02:00–02:59 gap.
    for (const s of slots) {
      const label = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        day: '2-digit',
        month: '2-digit',
      }).format(new Date(s.startMs));
      expect(label.includes('02:')).toBe(false);
    }
    // 01:00 and 03:15 local should exist (45-min grid: 60,105,150,195).
    const has0100 = slots.some(
      (s) => localWallToUtcMs({ year: 2026, month: 3, day: 29 }, 60, TZ) === s.startMs,
    );
    const has0315 = slots.some(
      (s) => localWallToUtcMs({ year: 2026, month: 3, day: 29 }, 195, TZ) === s.startMs,
    );
    expect(has0100).toBe(true);
    expect(has0315).toBe(true);
  });

  it('DST fall-back: does not duplicate slots (2026-10-25)', () => {
    // Italy falls back 2026-10-25 03:00 → 02:00. Window 01:00–04:00.
    const window: AvailabilityWindow = { weekday: 0, startMinutes: 60, endMinutes: 240 };
    const from = Date.UTC(2026, 9, 24, 0, 0, 0);
    const to = Date.UTC(2026, 9, 26, 12, 0, 0);
    const slots = generateSlots([window], {
      fromMs: from,
      toMs: to,
      slotMinutes: 45,
      bufferMinutes: 0,
      existing: [],
      nowMs: from,
      minLeadMinutes: 0,
      timeZone: TZ,
    });
    const starts = slots.map((s) => s.startMs);
    expect(new Set(starts).size).toBe(starts.length);
  });
});

describe('booking validation', () => {
  const validReq: Slot = {
    startMs: nextSaturday9Rome(),
    endMs: nextSaturday9Rome() + 45 * MIN,
  };

  it('accepts a valid Rome-local slot', () => {
    expect(validateBooking(validReq, [satWindow], [], DEFAULT_CONFIG, NOW, TZ).ok).toBe(true);
    expect(withinAnyWindow(validReq, [satWindow], TZ)).toBe(true);
  });

  it('rejects wrong duration, outside window, too soon, and conflicts', () => {
    expect(
      validateBooking(
        { startMs: validReq.startMs, endMs: validReq.startMs + 30 * MIN },
        [satWindow],
        [],
        DEFAULT_CONFIG,
        NOW,
        TZ,
      ).ok,
    ).toBe(false);
    const sun = localWallToUtcMs({ year: 2026, month: 6, day: 7 }, 540, TZ)!;
    expect(
      validateBooking(
        { startMs: sun, endMs: sun + 45 * MIN },
        [satWindow],
        [],
        DEFAULT_CONFIG,
        NOW,
        TZ,
      ).ok,
    ).toBe(false);
    expect(
      validateBooking(validReq, [satWindow], [], DEFAULT_CONFIG, validReq.startMs - 60 * MIN, TZ)
        .ok,
    ).toBe(false);
    expect(validateBooking(validReq, [satWindow], [validReq], DEFAULT_CONFIG, NOW, TZ).ok).toBe(
      false,
    );
  });

  it('rejects beyond the horizon', () => {
    const farSat = nextSaturday9Rome() + 60 * DAY;
    expect(
      validateBooking(
        { startMs: farSat, endMs: farSat + 45 * MIN },
        [satWindow],
        [],
        DEFAULT_CONFIG,
        NOW,
        TZ,
      ).ok,
    ).toBe(false);
  });
});

describe('viewing lifecycle', () => {
  it('follows REQUESTED → CONFIRMED → COMPLETED / NO_SHOW / CANCEL', () => {
    expect(nextViewingStatus('REQUESTED', 'CONFIRM')).toBe('CONFIRMED');
    expect(nextViewingStatus('CONFIRMED', 'COMPLETE')).toBe('COMPLETED');
    expect(nextViewingStatus('CONFIRMED', 'NO_SHOW')).toBe('NO_SHOW');
    expect(nextViewingStatus('REQUESTED', 'CANCEL')).toBe('CANCELLED');
    expect(() => nextViewingStatus('COMPLETED', 'CANCEL')).toThrow(ViewingTransitionError);
    expect(() => nextViewingStatus('REQUESTED', 'COMPLETE')).toThrow(ViewingTransitionError);
  });

  it('allows RESCHEDULE from REQUESTED and CONFIRMED back to REQUESTED', () => {
    expect(nextViewingStatus('REQUESTED', 'RESCHEDULE')).toBe('REQUESTED');
    expect(nextViewingStatus('CONFIRMED', 'RESCHEDULE')).toBe('REQUESTED');
    expect(() => nextViewingStatus('CANCELLED', 'RESCHEDULE')).toThrow(ViewingTransitionError);
  });
});
