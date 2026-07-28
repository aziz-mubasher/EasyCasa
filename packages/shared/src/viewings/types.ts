/** Recurring weekly availability — local wall-clock minutes in the listing TZ. */
export interface AvailabilityWindow {
  weekday: number; // 0=Sun … 6=Sat
  startMinutes: number;
  endMinutes: number;
}

export interface Slot {
  startMs: number;
  endMs: number;
}
