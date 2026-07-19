import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, validateBooking } from './booking';
import { overlaps } from './intervals';
import { nextViewingStatus, ViewingTransitionError } from './ports';
import { generateSlots } from './slots';
import type { AvailabilityWindow, Slot } from './types';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const NOW = Date.UTC(2026, 5, 3, 8, 0, 0);
const satWindow: AvailabilityWindow = { weekday: 6, startMinutes: 540, endMinutes: 720 };

function nextSaturday9(): number {
  return Date.UTC(2026, 5, 6, 9, 0, 0);
}

describe('viewing intervals', () => {
  it('overlaps respects the buffer', () => {
    const a: Slot = { startMs: 0, endMs: HOUR };
    expect(overlaps(a, { startMs: HOUR + 10 * MIN, endMs: 2 * HOUR }, 0)).toBe(false);
    expect(overlaps(a, { startMs: HOUR + 10 * MIN, endMs: 2 * HOUR }, 15 * MIN)).toBe(true);
  });
});

describe('slot generation', () => {
  it('generates back-to-back 45-min slots within a window', () => {
    const slots = generateSlots([satWindow], {
      fromMs: NOW,
      toMs: NOW + 7 * DAY,
      slotMinutes: 45,
      bufferMinutes: 15,
      existing: [],
      nowMs: NOW,
      minLeadMinutes: 120,
    });
    expect(slots.length).toBe(4);
    expect(slots[0]?.startMs).toBe(nextSaturday9());
  });

  it('excludes slots that conflict with an existing booking (buffer)', () => {
    const existing: Slot[] = [{ startMs: nextSaturday9(), endMs: nextSaturday9() + 45 * MIN }];
    const slots = generateSlots([satWindow], {
      fromMs: NOW,
      toMs: NOW + 7 * DAY,
      slotMinutes: 45,
      bufferMinutes: 15,
      existing,
      nowMs: NOW,
      minLeadMinutes: 120,
    });
    expect(slots.every((s) => s.startMs >= nextSaturday9() + 45 * MIN)).toBe(true);
    expect(slots.length).toBeLessThan(4);
  });

  it('excludes past / too-soon slots via lead time', () => {
    const sat0910 = nextSaturday9() + 10 * MIN;
    const earliest = sat0910 + 120 * MIN;
    const slots = generateSlots([satWindow], {
      fromMs: sat0910 - HOUR,
      toMs: sat0910 + 3 * HOUR,
      slotMinutes: 45,
      bufferMinutes: 15,
      existing: [],
      nowMs: sat0910,
      minLeadMinutes: 120,
    });
    expect(slots.every((s) => s.startMs >= earliest)).toBe(true);
    expect(slots.length).toBe(1);
    expect(slots[0]?.startMs).toBe(nextSaturday9() + 135 * MIN);
  });
});

describe('booking validation', () => {
  const validReq: Slot = { startMs: nextSaturday9(), endMs: nextSaturday9() + 45 * MIN };

  it('accepts a valid slot', () => {
    expect(validateBooking(validReq, [satWindow], [], DEFAULT_CONFIG, NOW).ok).toBe(true);
  });

  it('rejects wrong duration, outside window, too soon, and conflicts', () => {
    expect(
      validateBooking(
        { startMs: validReq.startMs, endMs: validReq.startMs + 30 * MIN },
        [satWindow],
        [],
        DEFAULT_CONFIG,
        NOW,
      ).ok,
    ).toBe(false);
    const sun = Date.UTC(2026, 5, 7, 9, 0, 0);
    expect(
      validateBooking({ startMs: sun, endMs: sun + 45 * MIN }, [satWindow], [], DEFAULT_CONFIG, NOW).ok,
    ).toBe(false);
    expect(validateBooking(validReq, [satWindow], [], DEFAULT_CONFIG, validReq.startMs - 60 * MIN).ok).toBe(
      false,
    );
    expect(validateBooking(validReq, [satWindow], [validReq], DEFAULT_CONFIG, NOW).ok).toBe(false);
  });

  it('rejects beyond the horizon', () => {
    const farSat = nextSaturday9() + 60 * DAY;
    expect(
      validateBooking({ startMs: farSat, endMs: farSat + 45 * MIN }, [satWindow], [], DEFAULT_CONFIG, NOW)
        .ok,
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
});
