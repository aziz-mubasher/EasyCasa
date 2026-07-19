import type { Slot } from './types';

export const DAY_MS = 86_400_000;
export const MIN_MS = 60_000;

/** Two intervals conflict if they overlap once each is padded by the buffer. */
export function overlaps(a: Slot, b: Slot, bufferMs: number): boolean {
  return a.startMs < b.endMs + bufferMs && b.startMs < a.endMs + bufferMs;
}

/** UTC midnight for the day containing `ms`. */
export function startOfUtcDay(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

/** UTC weekday (0=Sun … 6=Sat) for `ms`. */
export function utcWeekday(ms: number): number {
  return new Date(ms).getUTCDay();
}
