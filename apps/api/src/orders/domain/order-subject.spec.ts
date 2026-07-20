import { describe, expect, it } from 'vitest';

import { assertOrderSubject, buyerSubject, ownerSubject } from './order-subject';

describe('order subject (Phase 31)', () => {
  it('owner subject requires propertyId', () => {
    expect(ownerSubject('p1')).toEqual({ propertyId: 'p1', listingId: null });
    expect(ownerSubject('p1', 'L1')).toEqual({ propertyId: 'p1', listingId: 'L1' });
  });

  it('buyer subject roots on listing only', () => {
    expect(buyerSubject('L1')).toEqual({ propertyId: null, listingId: 'L1' });
  });

  it('rejects empty subject', () => {
    expect(() => assertOrderSubject({ propertyId: null, listingId: null })).toThrow(/propertyId/);
  });
});
