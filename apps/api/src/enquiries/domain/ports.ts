import type { Enquiry, EnquiryIntent, ListingParties, OrderDraft } from './types';

export interface EnquiryRepository {
  create(input: {
    listingId: string;
    seekerUserId: string;
    ownerUserId: string;
    mediatorUserId: string | null;
    intent: EnquiryIntent;
    message: string;
    contactEmail: string | null;
    contactPhone: string | null;
  }): Promise<Enquiry>;
  get(id: string): Promise<Enquiry | null>;
  listForSeeker(seekerUserId: string): Promise<Enquiry[]>;
  listForOwner(ownerUserId: string): Promise<Enquiry[]>;
  setStatus(id: string, status: Enquiry['status']): Promise<void>;
  setOrder(id: string, orderId: string, status: Enquiry['status']): Promise<void>;
}

/** Resolve a listing's owner (and assigned mediator, if any). */
export interface ListingLookupPort {
  getParties(listingId: string): Promise<ListingParties | null>;
}

/** Phase 10 order pipeline seam: create an order from an enquiry-derived draft. */
export interface OrderCreationPort {
  createFromDraft(draft: OrderDraft): Promise<{ orderId: string }>;
}

/** Notify a user about a new enquiry / follow-up. */
export interface EnquiryNotifier {
  notifyNewEnquiry(userId: string, enquiry: Enquiry): Promise<void>;
}

export const ENQUIRY_REPOSITORY = Symbol('ENQUIRY_REPOSITORY');
export const LISTING_LOOKUP = Symbol('LISTING_LOOKUP');
export const ORDER_CREATION = Symbol('ORDER_CREATION');
export const ENQUIRY_NOTIFIER = Symbol('ENQUIRY_NOTIFIER');
