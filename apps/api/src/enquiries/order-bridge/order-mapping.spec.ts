import { describe, expect, it } from 'vitest';

import type { OrderDraft } from '../domain/types';
import { buildCreateOrderInput } from './order-mapping';

function draft(over: Partial<OrderDraft> = {}): OrderDraft {
  return {
    partyUserId: 'seek',
    side: 'buyer',
    subjectListingId: 'L1',
    suggestedItemCodes: ['BUYER_MEDIATION', 'OFFER_DRAFTING'],
    ...over,
  };
}

describe('buildCreateOrderInput', () => {
  it('buyer draft → BUYER party with items + price reference', () => {
    const input = buildCreateOrderInput(draft(), { priceCents: 30_000_000 });
    expect(input.partyRole).toBe('BUYER');
    expect(input.partyUserId).toBe('seek');
    expect(input.listingId).toBe('L1');
    expect(input.itemCodes).toEqual(['BUYER_MEDIATION', 'OFFER_DRAFTING']);
    expect(input.referenceValueCents).toBe(30_000_000);
    expect(input.source).toBe('ENQUIRY');
  });

  it('owner-side draft maps to OWNER role', () => {
    expect(buildCreateOrderInput(draft({ side: 'owner' }), { priceCents: null }).partyRole).toBe(
      'OWNER',
    );
  });

  it('null price passes through as null reference value', () => {
    expect(buildCreateOrderInput(draft(), { priceCents: null }).referenceValueCents).toBeNull();
  });

  it('viewing-only draft carries the accompaniment item', () => {
    const input = buildCreateOrderInput(draft({ suggestedItemCodes: ['VIEWING_ACCOMPANIMENT'] }), {
      priceCents: 25_000_000,
    });
    expect(input.itemCodes).toEqual(['VIEWING_ACCOMPANIMENT']);
  });
});
