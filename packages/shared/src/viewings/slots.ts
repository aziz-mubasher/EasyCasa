import { MIN_MS, overlaps } from './intervals';
import type { AvailabilityWindow, Slot } from './types';
import {
  DEFAULT_LISTING_TIMEZONE,
  eachCalendarDayInZone,
  localWallToUtcMs,
} from './zoned-time';

export interface GenerateOptions {
  fromMs: number;
  toMs: number;
  slotMinutes: number;
  bufferMinutes: number;
  /** Existing bookings to avoid (with buffer). */
  existing: readonly Slot[];
  nowMs: number;
  minLeadMinutes: number;
  /**
   * IANA timezone for interpreting availability windows as local wall-clock.
   * Defaults to Europe/Rome.
   */
  timeZone?: string;
}

/**
 * Expand recurring weekly availability windows into concrete bookable slots
 * across [fromMs, toMs]. Windows are **local wall-clock** in `timeZone`;
 * returned slot instants are UTC epoch ms.
 */
export function generateSlots(windows: readonly AvailabilityWindow[], opts: GenerateOptions): Slot[] {
  const timeZone = opts.timeZone ?? DEFAULT_LISTING_TIMEZONE;
  const slotMs = opts.slotMinutes * MIN_MS;
  const bufferMs = opts.bufferMinutes * MIN_MS;
  const earliest = opts.nowMs + opts.minLeadMinutes * MIN_MS;
  const slots: Slot[] = [];
  const seen = new Set<number>();

  for (const day of eachCalendarDayInZone(opts.fromMs, opts.toMs, timeZone)) {
    for (const w of windows) {
      if (w.weekday !== day.weekday) continue;
      for (
        let start = w.startMinutes;
        start + opts.slotMinutes <= w.endMinutes;
        start += opts.slotMinutes
      ) {
        const s = localWallToUtcMs(day, start, timeZone);
        if (s == null) continue; // DST spring gap — skip nonexistent local time
        const e = s + slotMs;
        if (s < opts.fromMs || e > opts.toMs) continue;
        if (s < earliest) continue;
        if (seen.has(s)) continue; // DST fall-back guard
        const slot: Slot = { startMs: s, endMs: e };
        if (opts.existing.some((x) => overlaps(slot, x, bufferMs))) continue;
        seen.add(s);
        slots.push(slot);
      }
    }
  }

  slots.sort((a, b) => a.startMs - b.startMs);
  return slots;
}
