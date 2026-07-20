/**
 * Enquiry funnel — pure types. An enquiry is a seeker's expression of interest
 * on a listing; qualified enquiries convert into the Phase 10 order pipeline.
 */

export type EnquiryIntent = 'info' | 'viewing' | 'offer';

export type EnquiryStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'CLOSED';

export type EnquiryEvent = 'CONTACT' | 'QUALIFY' | 'CONVERT' | 'CLOSE' | 'REOPEN';

/** Which side of the deal an order created from an enquiry sits on. */
export type PartySide = 'buyer' | 'owner';

export interface Enquiry {
  id: string;
  listingId: string;
  seekerUserId: string;
  ownerUserId: string;
  mediatorUserId: string | null;
  intent: EnquiryIntent;
  status: EnquiryStatus;
  message: string;
  contactEmail: string | null;
  contactPhone: string | null;
  orderId: string | null;
}

/** Who to notify + whether the mediator should get a follow-up task. */
export interface EnquiryRouting {
  notifyUserIds: string[];
  createFollowUpTask: boolean;
}

/** A minimal order request handed to the Phase 10 pipeline on conversion. */
export interface OrderDraft {
  partyUserId: string;
  side: PartySide;
  subjectListingId: string;
  suggestedItemCodes: string[];
}

export interface ListingParties {
  /** Resolved listing UUID (input may have been a slug). */
  listingId: string;
  ownerUserId: string;
  mediatorUserId: string | null;
  title: string;
  slug: string;
  address: string | null;
}
