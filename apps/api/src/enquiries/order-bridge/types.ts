/**
 * Contract the enquiry funnel hands to the Phase 10 order pipeline on
 * conversion. Money in integer euro cents.
 */

export type PartyRole = 'BUYER' | 'OWNER';

/**
 * Matches how the owner checkout (Phase 16) creates orders: a party, the
 * subject listing, selected catalog items, and a reference value used to price
 * any provvigione item. Buyer-side orders carry the seeker as the party.
 *
 * Phase 31: BUYER orders root on `listingId`; OWNER orders still use a
 * property fascicolo via `Phase10OrdersAdapter`.
 */
export interface CreateOrderInput {
  partyUserId: string;
  partyRole: PartyRole;
  listingId: string;
  itemCodes: string[];
  /** Deal value the provvigione references (listing price); null when unknown. */
  referenceValueCents: number | null;
  source: 'ENQUIRY';
}

export interface ListingOrderContext {
  priceCents: number | null;
}
