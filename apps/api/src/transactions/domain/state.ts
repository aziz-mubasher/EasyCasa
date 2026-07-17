import type {
  MandateEvent,
  MandateStatus,
  OrderEvent,
  OrderStatus,
} from './types';

export class TransitionError extends Error {}

const MANDATE: Readonly<Record<MandateStatus, Partial<Record<MandateEvent, MandateStatus>>>> = {
  DRAFT: { SEND: 'SENT', WITHDRAW: 'WITHDRAWN' },
  SENT: { SIGN: 'SIGNED', WITHDRAW: 'WITHDRAWN', EXPIRE: 'EXPIRED' },
  SIGNED: {},
  WITHDRAWN: {},
  EXPIRED: {},
};

/**
 * Advance a mandate. Sending is additionally guarded on `canProceed`: a mandate
 * whose order still has unreviewed legal-basis items cannot be sent.
 */
export function nextMandateStatus(
  current: MandateStatus,
  event: MandateEvent,
  opts: { canProceed?: boolean } = {},
): MandateStatus {
  if (event === 'SEND' && opts.canProceed !== true) {
    throw new TransitionError('Cannot send mandate: legal basis review is incomplete');
  }
  const next = MANDATE[current][event];
  if (!next) throw new TransitionError(`Illegal mandate transition: ${event} from ${current}`);
  return next;
}

const ORDER: Readonly<Record<OrderStatus, Partial<Record<OrderEvent, OrderStatus>>>> = {
  QUOTED: { CONFIRM: 'CONFIRMED', CANCEL: 'CANCELLED' },
  CONFIRMED: { START: 'IN_PROGRESS', CANCEL: 'CANCELLED' },
  IN_PROGRESS: { COMPLETE: 'COMPLETED', CANCEL: 'CANCELLED' },
  COMPLETED: {},
  CANCELLED: {},
};

export function nextOrderStatus(current: OrderStatus, event: OrderEvent): OrderStatus {
  const next = ORDER[current][event];
  if (!next) throw new TransitionError(`Illegal order transition: ${event} from ${current}`);
  return next;
}
