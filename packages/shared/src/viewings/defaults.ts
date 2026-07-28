import type { AvailabilityWindow } from './types';

/** Pilot defaults: weekday evenings 18:00–20:00 + Saturday 10:00–13:00. */
export function defaultAvailabilityWindows(): AvailabilityWindow[] {
  const weekdayEve: AvailabilityWindow[] = [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startMinutes: 18 * 60,
    endMinutes: 20 * 60,
  }));
  return [
    ...weekdayEve,
    { weekday: 6, startMinutes: 10 * 60, endMinutes: 13 * 60 },
  ];
}

/** Total weekly hours covered by windows (overlapping ignored — sum of lengths). */
export function weeklyHours(windows: readonly AvailabilityWindow[]): number {
  let minutes = 0;
  for (const w of windows) {
    minutes += Math.max(0, w.endMinutes - w.startMinutes);
  }
  return minutes / 60;
}
