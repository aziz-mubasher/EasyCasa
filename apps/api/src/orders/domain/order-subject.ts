/**
 * Order subject root: owner fascicolo (property), published listing (buyer),
 * or signed-in catalog checkout user (`user_id` — see `service_orders_subject_chk`).
 * At least one of propertyId / listingId must be set for owner/buyer flows.
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
