import type { Enquiry, EnquiryIntent, EnquiryRouting, ListingParties, OrderDraft } from './types';

/**
 * Who to notify when an enquiry lands, and whether the mediator gets a
 * follow-up task. The owner is always notified; the mediator too when assigned.
 * Info-only enquiries don't create a follow-up task; viewing/offer do.
 */
export function planEnquiryRouting(intent: EnquiryIntent, parties: ListingParties): EnquiryRouting {
  const notify = new Set<string>([parties.ownerUserId]);
  if (parties.mediatorUserId) notify.add(parties.mediatorUserId);
  return {
    notifyUserIds: [...notify],
    createFollowUpTask: intent !== 'info',
  };
}

export interface ConvertDecision {
  ok: boolean;
  reason?: string;
}

/**
 * An enquiry can convert to an order only once it's QUALIFIED and hasn't already
 * been converted or closed. Info-only enquiries don't convert (no billable
 * service to order yet).
 */
export function canConvertToOrder(enquiry: Pick<Enquiry, 'status' | 'intent' | 'orderId'>): ConvertDecision {
  if (enquiry.orderId) return { ok: false, reason: 'Already converted' };
  if (enquiry.status !== 'QUALIFIED') return { ok: false, reason: 'Enquiry must be qualified first' };
  if (enquiry.intent === 'info') return { ok: false, reason: 'Info enquiries have no order to create' };
  return { ok: true };
}

/** Buyer-side catalog items suggested for the enquiry's intent. Illustrative codes. */
const ITEMS_BY_INTENT: Readonly<Record<EnquiryIntent, string[]>> = {
  info: [],
  viewing: ['VIEWING_ACCOMPANIMENT'],
  offer: ['BUYER_MEDIATION', 'OFFER_DRAFTING'],
};

/** Map a qualified enquiry to an order draft for the Phase 10 pipeline. */
export function buildOrderDraftFromEnquiry(
  enquiry: Pick<Enquiry, 'seekerUserId' | 'listingId' | 'intent'>,
): OrderDraft {
  return {
    partyUserId: enquiry.seekerUserId,
    side: 'buyer',
    subjectListingId: enquiry.listingId,
    suggestedItemCodes: ITEMS_BY_INTENT[enquiry.intent],
  };
}
