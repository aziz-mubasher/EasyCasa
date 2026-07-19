import { DAY_MS, MIN_MS, overlaps, startOfUtcDay, utcWeekday } from './intervals';
import type { AvailabilityWindow, Slot } from './types';

export interface GenerateOptions {
  fromMs: number;
  toMs: number;
  slotMinutes: number;
  bufferMinutes: number;
  /** Existing bookings to avoid (with buffer). */
  existing: readonly Slot[];
  nowMs: number;
  minLeadMinutes: number;
}

/**
 * Expand recurring weekly availability windows into concrete bookable slots
 * across [fromMs, toMs], excluding: past/too-soon slots, slots outside the
 * range, and slots that would conflict with an existing booking (buffer-padded).
 * Back-to-back within a window; deterministic; sorted ascending.
 */
export function generateSlots(windows: readonly AvailabilityWindow[], opts: GenerateOptions): Slot[] {
  const slotMs = opts.slotMinutes * MIN_MS;
  const bufferMs = opts.bufferMinutes * MIN_MS;
  const earliest = opts.nowMs + opts.minLeadMinutes * MIN_MS;
  const slots: Slot[] = [];

  for (let day = startOfUtcDay(opts.fromMs); day <= opts.toMs; day += DAY_MS) {
    const wd = utcWeekday(day);
    for (const w of windows) {
      if (w.weekday !== wd) continue;
      for (let start = w.startMinutes; start + opts.slotMinutes <= w.endMinutes; start += opts.slotMinutes) {
        const s = day + start * MIN_MS;
        const e = s + slotMs;
        if (s < opts.fromMs || e > opts.toMs) continue;
        if (s < earliest) continue;
        const slot: Slot = { startMs: s, endMs: e };
        if (opts.existing.some((x) => overlaps(slot, x, bufferMs))) continue;
        slots.push(slot);
      }
    }
  }

  slots.sort((a, b) => a.startMs - b.startMs);
  return slots;
}
