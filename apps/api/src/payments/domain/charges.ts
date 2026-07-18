import type { ChargePlan, OrderLine, PaymentEvent, PaymentStatus } from './types';

function grossOf(line: OrderLine): number {
  // Pass-through lines carry no IVA; everything else adds IVA on the imponibile.
  const iva = line.kind === 'passthrough' ? 0 : Math.round(line.imponibileCents * line.ivaRate);
  return line.imponibileCents + iva;
}

/**
 * Split an order's lines into what is charged now versus on success. The
 * provvigione is deferred to completion; fixed and pass-through are due now.
 */
export function planCharges(lines: readonly OrderLine[]): ChargePlan {
  let nowCents = 0;
  let onSuccessCents = 0;
  for (const line of lines) {
    const gross = grossOf(line);
    if (line.kind === 'provvigione') onSuccessCents += gross;
    else nowCents += gross;
  }
  return { nowCents, onSuccessCents };
}

/* Payment intent state machine ---------------------------------------- */

export class PaymentTransitionError extends Error {}

const TRANSITIONS: Readonly<
  Record<PaymentStatus, Partial<Record<PaymentEvent, PaymentStatus>>>
> = {
  REQUIRES_PAYMENT: { CONFIRM: 'PROCESSING' },
  PROCESSING: { SUCCEED: 'SUCCEEDED', FAIL: 'FAILED' },
  SUCCEEDED: { REFUND: 'REFUNDED' },
  FAILED: { RETRY: 'REQUIRES_PAYMENT' },
  REFUNDED: {},
};

export function nextPaymentStatus(current: PaymentStatus, event: PaymentEvent): PaymentStatus {
  const next = TRANSITIONS[current][event];
  if (!next) throw new PaymentTransitionError(`Illegal payment transition: ${event} from ${current}`);
  return next;
}
