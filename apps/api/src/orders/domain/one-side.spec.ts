import { describe, expect, it } from 'vitest';
import {
  assertOneSidePerProperty,
  isPaidOrderStatus,
  OneSideConflictError,
  partyFromSubject,
} from './one-side';

describe('one property, one side (R2)', () => {
  it('treats a property-rooted order as seller and a listing-only order as buyer', () => {
    expect(partyFromSubject({ propertyId: 'p1', listingId: 'L1' })).toBe('seller');
    expect(partyFromSubject({ propertyId: 'p1', listingId: null })).toBe('seller');
    expect(partyFromSubject({ propertyId: null, listingId: 'L1' })).toBe('buyer');
  });

  it('rejects a buyer order when a paid seller order already exists', () => {
    expect(() =>
      assertOneSidePerProperty({ party: 'buyer' }, [{ party: 'seller' }]),
    ).toThrow(OneSideConflictError);
  });

  it('rejects a seller order when a paid buyer order already exists', () => {
    expect(() =>
      assertOneSidePerProperty({ party: 'seller' }, [{ party: 'buyer' }]),
    ).toThrow(OneSideConflictError);
  });

  it('allows a second order on the same side', () => {
    expect(() =>
      assertOneSidePerProperty({ party: 'seller' }, [{ party: 'seller' }]),
    ).not.toThrow();
  });

  it('quoted and cancelled do not count as paid', () => {
    expect(isPaidOrderStatus('QUOTED')).toBe(false);
    expect(isPaidOrderStatus('quoted')).toBe(false);
    expect(isPaidOrderStatus('CANCELLED')).toBe(false);
    expect(isPaidOrderStatus('CONFIRMED')).toBe(true);
    expect(isPaidOrderStatus('confirmed')).toBe(true);
  });
});
