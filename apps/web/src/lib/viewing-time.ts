/** Display helpers for viewing slots — wall clock in Europe/Rome. */

export const VIEWING_DISPLAY_TZ = 'Europe/Rome';

/** Stable day bucket key (yyyy-mm-dd in Rome). */
export function romeDayKey(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VIEWING_DISPLAY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

export function formatRomeDay(ms: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: VIEWING_DISPLAY_TZ,
  }).format(new Date(ms));
}

export function formatRomeTime(ms: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: VIEWING_DISPLAY_TZ,
  }).format(new Date(ms));
}

export function formatRomeDateTime(ms: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: VIEWING_DISPLAY_TZ,
  }).format(new Date(ms));
}
