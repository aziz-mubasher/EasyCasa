import type { AvailabilityWindow, Slot, Viewing, ViewingEvent, ViewingStatus } from './types';

export class ViewingTransitionError extends Error {}

const TRANSITIONS: Readonly<Record<ViewingStatus, Partial<Record<ViewingEvent, ViewingStatus>>>> = {
  REQUESTED: { CONFIRM: 'CONFIRMED', CANCEL: 'CANCELLED', RESCHEDULE: 'REQUESTED' },
  CONFIRMED: {
    COMPLETE: 'COMPLETED',
    CANCEL: 'CANCELLED',
    NO_SHOW: 'NO_SHOW',
    RESCHEDULE: 'REQUESTED',
  },
  COMPLETED: {},
  CANCELLED: {},
  NO_SHOW: {},
};

export function nextViewingStatus(current: ViewingStatus, event: ViewingEvent): ViewingStatus {
  const next = TRANSITIONS[current][event];
  if (!next) throw new ViewingTransitionError(`Illegal viewing transition: ${event} from ${current}`);
  return next;
}

/* Ports ---------------------------------------------------------------- */

export interface AvailabilityRepository {
  getWindows(listingId: string): Promise<AvailabilityWindow[]>;
  setWindows(listingId: string, windows: AvailabilityWindow[]): Promise<void>;
}

export interface ViewingRepository {
  /**
   * Active (REQUESTED|CONFIRMED) viewings for a listing — used for capacity
   * occupancy (T22). Prefer {@link activeOccupancy} over treating every row
   * as a hard conflict.
   */
  activeOccupancy(
    listingId: string,
    excludeViewingId?: string,
  ): Promise<Array<{ startMs: number; endMs: number; status: 'REQUESTED' | 'CONFIRMED' }>>;
  /** @deprecated Prefer activeOccupancy + blockingSlotsFromOccupancy (T22). */
  activeSlots(listingId: string, excludeViewingId?: string): Promise<Slot[]>;
  /** Count CONFIRMED viewings at the same listing + start instant. */
  countConfirmedAt(
    listingId: string,
    startMs: number,
    excludeViewingId?: string,
  ): Promise<number>;
  create(input: {
    listingId: string;
    seekerUserId: string;
    conductorUserId: string;
    enquiryId: string | null;
    startMs: number;
    endMs: number;
  }): Promise<Viewing>;
  get(id: string): Promise<Viewing | null>;
  listForSeeker(seekerUserId: string): Promise<Viewing[]>;
  listForConductor(conductorUserId: string): Promise<Viewing[]>;
  setStatus(id: string, status: ViewingStatus): Promise<void>;
  /** Atomically move to a new slot, set REQUESTED, bump ICS SEQUENCE. */
  reschedule(id: string, startMs: number, endMs: number): Promise<Viewing>;
  /** CONFIRMED viewings due for a reminder window that have not been marked sent. */
  listDueReminders(
    kind: '24h' | '2h',
    windowStartMs: number,
    windowEndMs: number,
  ): Promise<Viewing[]>;
  markReminderSent(id: string, kind: '24h' | '2h'): Promise<void>;
}

/** Resolves who conducts a listing's viewings (assigned mediator, else owner). */
export interface ViewingListingLookup {
  getConductor(
    listingIdOrSlug: string,
  ): Promise<{
    listingId: string;
    conductorUserId: string;
    ownerUserId: string;
    title: string;
    address: string | null;
    city: string | null;
    province: string | null;
    timezone: string;
  } | null>;
}

export interface ViewingNotifier {
  notify(
    userId: string,
    viewing: Viewing,
    kind: 'requested' | 'confirmed' | 'cancelled' | 'reminder24h' | 'reminder2h',
  ): Promise<void>;
}
