/**
 * Viewings & scheduling — pure types. Times are epoch milliseconds (UTC).
 * Availability windows are local wall-clock minutes in the listing timezone.
 */

export type ViewingStatus = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type ViewingEvent = 'CONFIRM' | 'CANCEL' | 'COMPLETE' | 'NO_SHOW' | 'RESCHEDULE';

/** A recurring weekly availability window in local wall-clock minutes from midnight. */
export interface AvailabilityWindow {
  weekday: number; // 0=Sun … 6=Sat in the listing timezone
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
  /** ICS SEQUENCE — increments on reschedule. */
  icsSequence: number;
  /** Present on API responses for display / privacy. */
  timezone?: string;
  areaLabel?: string | null;
  /** Street address — only for CONFIRMED (seeker) or always for conductor. */
  address?: string | null;
  listingTitle?: string | null;
  /** EC-1 badge fields for conductor inbox (absent when not attached). */
  b4aBandMaxCents?: number | null;
  b4aExpiresAt?: string | null;
}
