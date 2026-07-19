/**
 * Viewings & scheduling — pure types. Times are epoch milliseconds (UTC); the
 * app converts to/from Europe/Rome at the edge.
 */

export type ViewingStatus = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type ViewingEvent = 'CONFIRM' | 'CANCEL' | 'COMPLETE' | 'NO_SHOW';

/** A recurring weekly availability window in wall-clock minutes from midnight. */
export interface AvailabilityWindow {
  weekday: number; // 0=Sun … 6=Sat (UTC day)
  startMinutes: number; // e.g. 9:00 → 540
  endMinutes: number; // e.g. 18:00 → 1080
}

export interface Slot {
  startMs: number;
  endMs: number;
}

export interface Viewing {
  id: string;
  listingId: string;
  seekerUserId: string;
  conductorUserId: string;
  enquiryId: string | null;
  startMs: number;
  endMs: number;
  status: ViewingStatus;
}
