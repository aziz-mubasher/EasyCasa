/** Recurring weekly availability — local wall-clock minutes in the listing TZ. */
export interface AvailabilityWindow {
  weekday: number; // 0=Sun … 6=Sat
  startMinutes: number;
  endMinutes: number;
  /**
   * Max CONFIRMED viewings per concrete slot from this window (EC-S T22).
   * Default 1 preserves agent one-visitor-per-slot behaviour. Requests are unbounded.
   */
  capacity?: number;
}

export interface Slot {
  startMs: number;
  endMs: number;
}
