/**
 * Order subject root: owner fascicolo (property) and/or published listing (buyer).
 * At least one must be set — mirrors `service_orders_subject_chk`.
 */
export type OrderSubject = {
  propertyId: string | null;
  listingId: string | null;
};

export function assertOrderSubject(subject: OrderSubject): OrderSubject {
  if (!subject.propertyId && !subject.listingId) {
    throw new Error('Order requires propertyId and/or listingId');
  }
  return subject;
}

export function ownerSubject(propertyId: string, listingId: string | null = null): OrderSubject {
  return assertOrderSubject({ propertyId, listingId });
}

export function buyerSubject(listingId: string): OrderSubject {
  return assertOrderSubject({ propertyId: null, listingId });
}
