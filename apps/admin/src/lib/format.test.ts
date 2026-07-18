import { describe, expect, it } from 'vitest';

import {
  daysUntil,
  formatEuroCents,
  leaseUrgency,
  registrationDeadline,
  riskVariant,
  urgencyVariant,
} from './format';
import type { Lease } from '@easycasa/api-client';

const NOW = new Date('2026-07-17T00:00:00Z');

function lease(over: Partial<Lease> = {}): Lease {
  return {
    id: 'l1',
    propertyId: 'p1',
    type: 'LIBERO_4_4',
    startAt: '2026-07-20',
    durationMonths: 48,
    annualRentCents: 1_200_000,
    cedolareSecca: false,
    highTension: false,
    apeAttached: true,
    registrationProtocollo: null,
    registeredAt: null,
    ...over,
  };
}

describe('format helpers', () => {
  it('formatEuroCents', () => {
    expect(formatEuroCents(24_000)).toBe('€ 240,00');
    expect(formatEuroCents(6700)).toBe('€ 67,00');
    expect(formatEuroCents(100_000_000)).toBe('€ 1.000.000,00');
  });

  it('registrationDeadline is 30 days from earlier of sign/start', () => {
    expect(registrationDeadline({ startAt: '2026-07-20' })).toBe('2026-08-19');
    expect(registrationDeadline({ startAt: '2026-07-20', signedAt: '2026-07-10' })).toBe(
      '2026-08-09',
    );
  });

  it('daysUntil', () => {
    expect(daysUntil('2026-07-20', NOW)).toBe(3);
    expect(daysUntil('2026-07-15', NOW)).toBe(-2);
  });

  it('leaseUrgency: registered short-circuits', () => {
    expect(leaseUrgency(lease({ registrationProtocollo: 'T123' }), NOW).urgency).toBe(
      'registered',
    );
  });

  it('leaseUrgency: overdue when deadline passed', () => {
    const r = leaseUrgency(lease({ startAt: '2026-05-01' }), NOW);
    expect(r.urgency).toBe('overdue');
    expect(r.days).toBeLessThan(0);
  });

  it('leaseUrgency: urgent within 5 days', () => {
    expect(leaseUrgency(lease({ startAt: '2026-06-20' }), NOW).urgency).toBe('urgent');
  });

  it('leaseUrgency: ok when far out', () => {
    expect(leaseUrgency(lease({ startAt: '2026-07-20' }), NOW).urgency).toBe('ok');
  });

  it('riskVariant maps levels', () => {
    expect(riskVariant('HIGH')).toBe('red');
    expect(riskVariant('MEDIUM')).toBe('amber');
    expect(riskVariant('LOW')).toBe('green');
  });

  it('urgencyVariant maps urgency', () => {
    expect(urgencyVariant('overdue')).toBe('red');
    expect(urgencyVariant('urgent')).toBe('amber');
    expect(urgencyVariant('registered')).toBe('grey');
    expect(urgencyVariant('ok')).toBe('green');
  });
});
