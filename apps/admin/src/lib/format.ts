/**
 * Pure presentation helpers for the admin console. Deterministic and testable —
 * no React, no dates-from-now surprises (the clock is injected).
 */
import type { KycCase, Lease } from '@easycasa/api-client';

export function formatEuroCents(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const euros = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const rem = (abs % 100).toString().padStart(2, '0');
  return `${negative ? '-' : ''}€ ${euros},${rem}`;
}

/** RLI registration deadline: 30 days from the earlier of signing or start. */
export function registrationDeadline(lease: Pick<Lease, 'startAt' | 'signedAt'>): string {
  const start = new Date(lease.startAt).getTime();
  const signed = lease.signedAt ? new Date(lease.signedAt).getTime() : Number.POSITIVE_INFINITY;
  const d = new Date(Math.min(start, signed));
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export type Urgency = 'registered' | 'overdue' | 'urgent' | 'soon' | 'ok';

/** Days from `now` to the deadline (negative = past). */
export function daysUntil(deadlineISO: string, now: Date): number {
  const ms = new Date(deadlineISO).getTime() - now.getTime();
  return Math.floor(ms / 86_400_000);
}

/**
 * Registration urgency for the RLI monitor. Registered leases short-circuit;
 * otherwise urgency ramps as the 30-day deadline approaches.
 */
export function leaseUrgency(lease: Lease, now: Date): { urgency: Urgency; days: number } {
  if (lease.registrationProtocollo) return { urgency: 'registered', days: 0 };
  const days = daysUntil(registrationDeadline(lease), now);
  if (days < 0) return { urgency: 'overdue', days };
  if (days <= 5) return { urgency: 'urgent', days };
  if (days <= 15) return { urgency: 'soon', days };
  return { urgency: 'ok', days };
}

/** Badge colour token per KYC risk level. */
export function riskVariant(level: KycCase['assessment']['level']): 'green' | 'amber' | 'red' {
  return level === 'HIGH' ? 'red' : level === 'MEDIUM' ? 'amber' : 'green';
}

/** Badge colour token per urgency. */
export function urgencyVariant(urgency: Urgency): 'green' | 'amber' | 'red' | 'grey' {
  switch (urgency) {
    case 'overdue':
      return 'red';
    case 'urgent':
      return 'amber';
    case 'soon':
      return 'amber';
    case 'registered':
      return 'grey';
    case 'ok':
    default:
      return 'green';
  }
}
