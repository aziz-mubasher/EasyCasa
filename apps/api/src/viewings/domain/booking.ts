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

/** Active booking used for capacity / conflict checks (T22). */
export interface OccupancyBooking {
  startMs: number;
  endMs: number;
  status: 'REQUESTED' | 'CONFIRMED';
}

/** i18n code for over-capacity confirm refusals. */
export const VIEWING_CAPACITY_FULL_CODE = 'viewings.errors.capacityFull';

/**
 * True when `slot` sits entirely inside a weekly window, interpreting the
 * window in `timeZone` local wall-clock.
 */
export function withinAnyWindow(
  slot: Slot,
  windows: readonly AvailabilityWindow[],
  timeZone: string = DEFAULT_LISTING_TIMEZONE,
): boolean {
  return windowForSlot(slot, windows, timeZone) != null;
}

/** Resolve the availability window covering `slot`, or null. */
export function windowForSlot(
  slot: Slot,
  windows: readonly AvailabilityWindow[],
  timeZone: string = DEFAULT_LISTING_TIMEZONE,
): AvailabilityWindow | null {
  const start = calendarInZone(slot.startMs, timeZone);
  const end = calendarInZone(slot.endMs, timeZone);
  // Slot must not cross a local midnight (45-min slots never do).
  if (
    start.year !== end.year ||
    start.month !== end.month ||
    start.day !== end.day
  ) {
    return null;
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
  if (expected == null || expected !== slot.startMs) return null;

  return (
    windows.find(
      (w) =>
        w.weekday === start.weekday &&
        w.startMinutes <= startMin &&
        endMin <= w.endMinutes,
    ) ?? null
  );
}

/** Effective capacity for a window (default 1). */
export function windowCapacity(window: AvailabilityWindow | null | undefined): number {
  const c = window?.capacity;
  if (c == null || !Number.isFinite(c) || c < 1) return 1;
  return Math.floor(c);
}

/**
 * Confirm is allowed while confirmedCount < capacity.
 * REQUESTED does not count (T22 — requests unbounded).
 */
export function canConfirmAgainstCapacity(
  confirmedCount: number,
  capacity: number,
): boolean {
  const cap = capacity < 1 ? 1 : Math.floor(capacity);
  return confirmedCount < cap;
}

/**
 * Whether a concrete start time should block new slot generation / booking.
 *
 * - capacity ≤ 1 (agent default): any REQUESTED or CONFIRMED fills the slot
 *   (byte-identical to Phase 29 LIMIT-1 behaviour).
 * - capacity > 1 (open house): only CONFIRMED counts toward capacity;
 *   REQUESTED is unbounded.
 */
export function isSlotAtCapacity(
  confirmedCount: number,
  requestedCount: number,
  capacity: number,
): boolean {
  const cap = capacity < 1 ? 1 : Math.floor(capacity);
  if (cap <= 1) {
    return confirmedCount + requestedCount >= 1;
  }
  return confirmedCount >= cap;
}

/**
 * Build the list of "blocking" slots for `generateSlots` / `validateBooking`
 * from active bookings + window capacities.
 */
export function blockingSlotsFromOccupancy(
  windows: readonly AvailabilityWindow[],
  bookings: readonly OccupancyBooking[],
  timeZone: string = DEFAULT_LISTING_TIMEZONE,
  slotMinutes = DEFAULT_CONFIG.slotMinutes,
): Slot[] {
  const byStart = new Map<number, { confirmed: number; requested: number; endMs: number }>();
  for (const b of bookings) {
    const cur = byStart.get(b.startMs) ?? { confirmed: 0, requested: 0, endMs: b.endMs };
    if (b.status === 'CONFIRMED') cur.confirmed += 1;
    else cur.requested += 1;
    cur.endMs = Math.max(cur.endMs, b.endMs);
    byStart.set(b.startMs, cur);
  }

  const blocking: Slot[] = [];
  for (const [startMs, counts] of byStart) {
    const endMs = counts.endMs || startMs + slotMinutes * MIN_MS;
    const slot: Slot = { startMs, endMs };
    const cap = windowCapacity(windowForSlot(slot, windows, timeZone));
    if (isSlotAtCapacity(counts.confirmed, counts.requested, cap)) {
      blocking.push(slot);
    }
  }
  return blocking;
}

/**
 * Validate a booking request against availability, timing, and existing
 * viewings. Pure; the same rules `generateSlots` applies, checked independently
 * so a stale client can't book an invalid slot.
 *
 * `existing` should be the *blocking* set from {@link blockingSlotsFromOccupancy}
 * (capacity-aware), not every REQUESTED row when capacity > 1.
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
