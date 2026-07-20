import type { AvailabilityWindow, Slot, Viewing, ViewingEvent, ViewingStatus } from './types';

export class ViewingTransitionError extends Error {}

const TRANSITIONS: Readonly<Record<ViewingStatus, Partial<Record<ViewingEvent, ViewingStatus>>>> = {
  REQUESTED: { CONFIRM: 'CONFIRMED', CANCEL: 'CANCELLED' },
  CONFIRMED: { COMPLETE: 'COMPLETED', CANCEL: 'CANCELLED', NO_SHOW: 'NO_SHOW' },
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
  /** Active (non-cancelled) viewings for a listing, as slots, for conflict checks. */
  activeSlots(listingId: string): Promise<Slot[]>;
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
  } | null>;
}

export interface ViewingNotifier {
  notify(userId: string, viewing: Viewing, kind: 'requested' | 'confirmed' | 'cancelled'): Promise<void>;
}
