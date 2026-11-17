/** Europe/Rome wall clock. DST-aware via Intl, no extra dependency. */

export const ROME = 'Europe/Rome';

export type RomeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** ISO weekday: 1 Monday … 7 Sunday. */
  weekday: number;
};

const WEEKDAY: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function romeParts(date: Date): RomeParts {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROME,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour === '24' ? '0' : bag.hour),
    minute: Number(bag.minute),
    weekday: WEEKDAY[bag.weekday] ?? 1,
  };
}

/** Instant of a Rome wall-clock time. Invalid spring-forward times land on the next valid minute. */
export function romeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 4; i += 1) {
    const p = romeParts(new Date(utc));
    const got = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    const want = Date.UTC(year, month - 1, day, hour, minute);
    const delta = want - got;
    if (delta === 0) return new Date(utc);
    utc += delta;
  }
  return new Date(utc);
}

export function romeDateKey(date: Date): string {
  const p = romeParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function addRomeDays(year: number, month: number, day: number, days: number): RomeParts {
  const noon = romeToUtc(year, month, day, 12, 0);
  return romeParts(new Date(noon.getTime() + days * 86_400_000));
}

export function romeMinutes(date: Date): number {
  const p = romeParts(date);
  return p.hour * 60 + p.minute;
}
