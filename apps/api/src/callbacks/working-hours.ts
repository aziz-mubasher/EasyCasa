import type { ConfirmWithin } from '@easycasa/shared';

import { addRomeDays, romeParts, romeToUtc } from './rome';

/**
 * Deadline clock. Guess, stated in docs/callbacks.md:
 * Mon–Fri 09:00–17:00 Europe/Rome (8 working hours).
 * "1 working day" is 8 of those hours, not a calendar day.
 */
export const OFFICE_START_MIN = 9 * 60;
export const OFFICE_END_MIN = 17 * 60;

export function confirmWithinMinutes(value: ConfirmWithin): number {
  if (value === '2h') return 120;
  if (value === '1d') return 8 * 60;
  return 240;
}

function atMinutes(year: number, month: number, day: number, minutes: number): Date {
  return romeToUtc(year, month, day, Math.floor(minutes / 60), minutes % 60);
}

/** Move `from` to the next open office instant (inclusive). */
function snapOpen(from: Date): Date {
  const p = romeParts(from);
  const mins = p.hour * 60 + p.minute;
  const weekend = p.weekday >= 6;
  if (!weekend && mins < OFFICE_START_MIN) return atMinutes(p.year, p.month, p.day, OFFICE_START_MIN);
  if (!weekend && mins < OFFICE_END_MIN) return from;
  let cursor = p;
  for (let i = 0; i < 8; i += 1) {
    cursor = addRomeDays(cursor.year, cursor.month, cursor.day, 1);
    if (cursor.weekday <= 5) return atMinutes(cursor.year, cursor.month, cursor.day, OFFICE_START_MIN);
  }
  return from;
}

export function addWorkingMinutes(from: Date, minutes: number): Date {
  let cursor = snapOpen(from);
  let left = minutes;
  while (left > 0) {
    const p = romeParts(cursor);
    const nowMin = p.hour * 60 + p.minute;
    const available = OFFICE_END_MIN - nowMin;
    if (available >= left) return new Date(cursor.getTime() + left * 60_000);
    left -= Math.max(available, 0);
    cursor = snapOpen(atMinutes(p.year, p.month, p.day, OFFICE_END_MIN));
  }
  return cursor;
}

export function dueAtFrom(from: Date, within: ConfirmWithin): Date {
  return addWorkingMinutes(from, confirmWithinMinutes(within));
}
