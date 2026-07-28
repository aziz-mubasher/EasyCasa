/** Calendar date helpers in Europe/Rome (EC-3). */

const ROME = 'Europe/Rome';

/**
 * YYYY-MM-DD for `date` in `Europe/Rome`.
 * Uses `en-CA` so Intl yields ISO-like `YYYY-MM-DD`.
 */
export function calendarDateInRome(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ROME,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** True when `expiresAt` (YYYY-MM-DD) is today or later in Europe/Rome. */
export function isExpiresOnOrAfterRomeToday(
  expiresAt: string,
  now: Date = new Date(),
): boolean {
  return expiresAt >= calendarDateInRome(now);
}
