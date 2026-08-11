import type { Enquiry, EnquiryIntent, ListingParties, OrderDraft } from './types';

export interface Banks4AllAttestationFields {
  b4aToken: string | null;
  b4aBandMaxCents: number | null;
  b4aExpiresAt: string | null;
  b4aCheckedAt: Date | null;
  /** EC-S-T20 — stored for inbox four-field display. */
  b4aHolderInitials?: string | null;
  /** EC-S-T20 — `valid` | `revoked`; expiry still computed at read. */
  b4aStatus?: 'valid' | 'revoked' | null;
}

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
    contactWhatsappAvailable: boolean;
    b4aToken?: string | null;
    b4aBandMaxCents?: number | null;
    b4aExpiresAt?: string | null;
    b4aCheckedAt?: Date | null;
    b4aHolderInitials?: string | null;
    b4aStatus?: 'valid' | 'revoked' | null;
  }): Promise<Enquiry>;
  get(id: string): Promise<Enquiry | null>;
  listForSeeker(seekerUserId: string): Promise<Enquiry[]>;
  /** Inbound for listing owner or assigned mediator. */
  listForOwner(userId: string): Promise<Enquiry[]>;
  setStatus(id: string, status: Enquiry['status']): Promise<void>;
  setOrder(id: string, orderId: string, status: Enquiry['status']): Promise<void>;
  setBanks4All(id: string, fields: Banks4AllAttestationFields): Promise<void>;
  clearBanks4All(id: string): Promise<void>;
  /** Clear attestation columns for all enquiries of a seeker (consent withdrawal). */
  clearBanks4AllForSeeker(seekerUserId: string): Promise<number>;
  /** Tokens due for nightly re-verify (`b4a_checked_at` older than 24h). */
  listBanks4AllDueForSweep(): Promise<Enquiry[]>;
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
