import { describe, expect, it } from 'vitest';

import { planCharges, nextPaymentStatus, PaymentTransitionError } from './charges';
import type { OrderLine } from './types';

const lines: OrderLine[] = [
  { code: 'DOC_CHECK', kind: 'fixed', imponibileCents: 10_000, ivaRate: 0.22 },
  { code: 'REGISTRO_PASSTHROUGH', kind: 'passthrough', imponibileCents: 6700, ivaRate: 0 },
  { code: 'MEDIATION', kind: 'provvigione', imponibileCents: 300_000, ivaRate: 0.22 },
];

describe('planCharges', () => {
  it('fixed + passthrough now, provvigione on success', () => {
    const plan = planCharges(lines);
    expect(plan.nowCents).toBe(12_200 + 6700);
    expect(plan.onSuccessCents).toBe(366_000);
  });

  it('empty order', () => {
    expect(planCharges([])).toEqual({ nowCents: 0, onSuccessCents: 0 });
  });
});

describe('nextPaymentStatus', () => {
  it('REQUIRES_PAYMENT → PROCESSING → SUCCEEDED → REFUNDED', () => {
    expect(nextPaymentStatus('REQUIRES_PAYMENT', 'CONFIRM')).toBe('PROCESSING');
    expect(nextPaymentStatus('PROCESSING', 'SUCCEED')).toBe('SUCCEEDED');
    expect(nextPaymentStatus('SUCCEEDED', 'REFUND')).toBe('REFUNDED');
  });

  it('FAILED can retry', () => {
    expect(nextPaymentStatus('PROCESSING', 'FAIL')).toBe('FAILED');
    expect(nextPaymentStatus('FAILED', 'RETRY')).toBe('REQUIRES_PAYMENT');
  });

  it('illegal transitions throw', () => {
    expect(() => nextPaymentStatus('REQUIRES_PAYMENT', 'SUCCEED')).toThrow(PaymentTransitionError);
    expect(() => nextPaymentStatus('REFUNDED', 'CONFIRM')).toThrow(PaymentTransitionError);
  });
});
