import { MIN_MS, overlaps } from './intervals';
import type { AvailabilityWindow, Slot } from './types';
import {
  DEFAULT_LISTING_TIMEZONE,
  calendarInZone,
  localWallToUtcMs,
} from './zoned-time';

export interface SchedulingConfig {
  slotMinutes: number;
  bufferMinutes: number;
  minLeadMinutes: number;
  maxHorizonDays: number;
}

export const DEFAULT_CONFIG: SchedulingConfig = {
  slotMinutes: 45,
  bufferMinutes: 15,
  minLeadMinutes: 120, // 2h notice
  maxHorizonDays: 30,
};

export interface BookingDecision {
  ok: boolean;
  reason?: string;
}

/**
 * True when `slot` sits entirely inside a weekly window, interpreting the
 * window in `timeZone` local wall-clock.
 */
export function withinAnyWindow(
  slot: Slot,
  windows: readonly AvailabilityWindow[],
  timeZone: string = DEFAULT_LISTING_TIMEZONE,
): boolean {
  const start = calendarInZone(slot.startMs, timeZone);
  const end = calendarInZone(slot.endMs, timeZone);
  // Slot must not cross a local midnight (45-min slots never do).
  if (
    start.year !== end.year ||
    start.month !== end.month ||
    start.day !== end.day
  ) {
    return false;
  }
  const startMin = start.hour * 60 + start.minute;
  const endParts = calendarInZone(slot.endMs, timeZone);
  const endMin = endParts.hour * 60 + endParts.minute;
  // Reconstruct expected UTC for this local start — reject if spring-gap / wrong offset.
  const expected = localWallToUtcMs(
    { year: start.year, month: start.month, day: start.day },
    startMin,
    timeZone,
  );
  if (expected == null || expected !== slot.startMs) return false;

  return windows.some(
    (w) =>
      w.weekday === start.weekday &&
      w.startMinutes <= startMin &&
      endMin <= w.endMinutes,
  );
}

/**
 * Validate a booking request against availability, timing, and existing
 * viewings. Pure; the same rules `generateSlots` applies, checked independently
 * so a stale client can't book an invalid slot.
 */
export function validateBooking(
  request: Slot,
  windows: readonly AvailabilityWindow[],
  existing: readonly Slot[],
  cfg: SchedulingConfig,
  nowMs: number,
  timeZone: string = DEFAULT_LISTING_TIMEZONE,
): BookingDecision {
  if (request.endMs - request.startMs !== cfg.slotMinutes * MIN_MS) {
    return { ok: false, reason: 'Invalid slot duration' };
  }
  if (request.startMs < nowMs + cfg.minLeadMinutes * MIN_MS) {
    return { ok: false, reason: 'Too soon — more notice required' };
  }
  if (request.startMs > nowMs + cfg.maxHorizonDays * 24 * 60 * MIN_MS) {
    return { ok: false, reason: 'Beyond the booking horizon' };
  }
  if (!withinAnyWindow(request, windows, timeZone)) {
    return { ok: false, reason: 'Outside availability' };
  }
  const bufferMs = cfg.bufferMinutes * MIN_MS;
  if (existing.some((x) => overlaps(request, x, bufferMs))) {
    return { ok: false, reason: 'Slot no longer available' };
  }
  return { ok: true };
}
