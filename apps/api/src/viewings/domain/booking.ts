import { MIN_MS, overlaps, startOfUtcDay, utcWeekday } from './intervals';
import type { AvailabilityWindow, Slot } from './types';

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

function withinAnyWindow(slot: Slot, windows: readonly AvailabilityWindow[]): boolean {
  const day = startOfUtcDay(slot.startMs);
  const wd = utcWeekday(slot.startMs);
  const startMin = (slot.startMs - day) / MIN_MS;
  const endMin = (slot.endMs - day) / MIN_MS;
  return windows.some((w) => w.weekday === wd && w.startMinutes <= startMin && endMin <= w.endMinutes);
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
  if (!withinAnyWindow(request, windows)) {
    return { ok: false, reason: 'Outside availability' };
  }
  const bufferMs = cfg.bufferMinutes * MIN_MS;
  if (existing.some((x) => overlaps(request, x, bufferMs))) {
    return { ok: false, reason: 'Slot no longer available' };
  }
  return { ok: true };
}
