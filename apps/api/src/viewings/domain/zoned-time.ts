/**
 * Zone-aware wall-clock helpers for viewing availability.
 *
 * Domain code stays free of `Date.now()`; these helpers take an explicit IANA
 * zone and only use `Intl` for deterministic offset lookup (no system TZ).
 */

export const DEFAULT_LISTING_TIMEZONE = 'Europe/Rome';

export interface CalendarYmd {
  year: number;
  month: number; // 1–12
  day: number;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format parts for `utcMs` in `timeZone`. */
function zonedParts(
  utcMs: number,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0=Sun … 6=Sat
} {
  if (!Number.isFinite(utcMs)) {
    throw new RangeError(`Invalid utcMs: ${utcMs}`);
  }
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const wdMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: wdMap[map.weekday ?? ''] ?? 0,
  };
}

function matchesWall(
  utcMs: number,
  ymd: CalendarYmd,
  hour: number,
  minute: number,
  timeZone: string,
): boolean {
  const p = zonedParts(utcMs, timeZone);
  return (
    p.year === ymd.year &&
    p.month === ymd.month &&
    p.day === ymd.day &&
    p.hour === hour &&
    p.minute === minute
  );
}

/** Calendar Y-M-D + weekday + wall clock for an instant in `timeZone`. */
export function calendarInZone(
  utcMs: number,
  timeZone: string,
): CalendarYmd & { weekday: number; hour: number; minute: number } {
  const p = zonedParts(utcMs, timeZone);
  return {
    year: p.year,
    month: p.month,
    day: p.day,
    weekday: p.weekday,
    hour: p.hour,
    minute: p.minute,
  };
}

/** Add `delta` calendar days (Gregorian). */
export function addCalendarDays(ymd: CalendarYmd, delta: number): CalendarYmd {
  const utc = Date.UTC(ymd.year, ymd.month - 1, ymd.day + delta);
  const d = new Date(utc);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Convert local wall-clock in `timeZone` to a UTC epoch ms.
 * Returns `null` when the local time falls in a DST spring-forward gap
 * (nonexistent). On fall-back ambiguity, picks the **earlier** UTC instant
 * (first occurrence) so recurring windows do not duplicate slots.
 */
export function localWallToUtcMs(
  ymd: CalendarYmd,
  minutesFromMidnight: number,
  timeZone: string,
): number | null {
  const hour = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  // Iterative correction: treat desired local as UTC, then subtract the zone offset.
  let utc = Date.UTC(ymd.year, ymd.month - 1, ymd.day, hour, minute, 0);
  for (let i = 0; i < 4; i += 1) {
    const p = zonedParts(utc, timeZone);
    const got = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
    const want = Date.UTC(ymd.year, ymd.month - 1, ymd.day, hour, minute, 0);
    const diff = want - got;
    if (diff === 0) break;
    utc += diff;
  }

  if (matchesWall(utc, ymd, hour, minute, timeZone)) {
    const earlier = utc - 3_600_000;
    if (matchesWall(earlier, ymd, hour, minute, timeZone)) return earlier;
    return utc;
  }

  for (const delta of [-3_600_000, 3_600_000, -7_200_000, 7_200_000]) {
    const cand = utc + delta;
    if (matchesWall(cand, ymd, hour, minute, timeZone)) {
      const earlier = cand - 3_600_000;
      if (matchesWall(earlier, ymd, hour, minute, timeZone)) return earlier;
      return cand;
    }
  }

  return null; // nonexistent (spring gap)
}

/** Iterate each calendar day from `fromMs` through `toMs` in `timeZone`. */
export function* eachCalendarDayInZone(
  fromMs: number,
  toMs: number,
  timeZone: string,
): Generator<CalendarYmd & { weekday: number }> {
  let cur: CalendarYmd & { weekday: number } = calendarInZone(fromMs, timeZone);
  const end = calendarInZone(toMs, timeZone);
  for (let i = 0; i < 400; i += 1) {
    yield cur;
    if (cur.year === end.year && cur.month === end.month && cur.day === end.day) return;
    const next = addCalendarDays(cur, 1);
    // Noon local is always defined (never in a 2–3am spring gap).
    const noonUtc =
      localWallToUtcMs(next, 12 * 60, timeZone) ??
      Date.UTC(next.year, next.month - 1, next.day, 10, 0, 0);
    cur = { ...next, weekday: calendarInZone(noonUtc, timeZone).weekday };
  }
}
