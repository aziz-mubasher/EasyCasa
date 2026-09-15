/**
 * R2 — one property, one side.
 * If a paid seller-side order exists on a property (or its listing), a buyer-side
 * order on the same subject is refused, and the other way round.
 */

export type OrderParty = 'seller' | 'buyer';

export const PAID_ORDER_STATUSES = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] as const;

export type PaidOrderStatus = (typeof PAID_ORDER_STATUSES)[number];

export function isPaidOrderStatus(status: string): boolean {
  return (PAID_ORDER_STATUSES as readonly string[]).includes(status.toUpperCase());
}

export function partyFromSubject(subject: {
  propertyId: string | null;
  listingId: string | null;
}): OrderParty {
  return subject.propertyId ? 'seller' : 'buyer';
}

export class OneSideConflictError extends Error {
  readonly code = 'ONE_PROPERTY_ONE_SIDE';

  constructor(message = 'One property, one side: a paid order already exists for the other party') {
    super(message);
    this.name = 'OneSideConflictError';
  }
}

export function assertOneSidePerProperty(
  incoming: { party: OrderParty },
  existingPaid: ReadonlyArray<{ party: OrderParty }>,
): void {
  if (existingPaid.some((row) => row.party !== incoming.party)) {
    throw new OneSideConflictError();
  }
}
