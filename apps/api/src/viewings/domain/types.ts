/**
 * Viewings & scheduling — pure types. Times are epoch milliseconds (UTC).
 * Availability windows are local wall-clock minutes in the listing timezone.
 */

export type { AvailabilityWindow, Slot } from '@easycasa/shared';

export type ViewingStatus = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type ViewingEvent = 'CONFIRM' | 'CANCEL' | 'COMPLETE' | 'NO_SHOW' | 'RESCHEDULE';

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
