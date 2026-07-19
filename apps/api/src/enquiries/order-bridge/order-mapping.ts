import type { OrderDraft } from '../domain/types';
import type { CreateOrderInput, ListingOrderContext } from './types';

/**
 * Map an enquiry-derived order draft to the Phase 10 create-order input. Pure:
 * the seeker becomes a BUYER-side party, the suggested catalog items carry
 * through, and the listing price becomes the provvigione reference value.
 */
export function buildCreateOrderInput(
  draft: OrderDraft,
  ctx: ListingOrderContext,
): CreateOrderInput {
  return {
    partyUserId: draft.partyUserId,
    partyRole: draft.side === 'buyer' ? 'BUYER' : 'OWNER',
    listingId: draft.subjectListingId,
    itemCodes: draft.suggestedItemCodes,
    referenceValueCents: ctx.priceCents,
    source: 'ENQUIRY',
  };
}
