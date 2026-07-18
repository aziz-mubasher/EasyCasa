/**
 * Payments domain — pure types. Money in integer euro cents.
 *
 * Charge timing mirrors the à-la-carte model (Phase 8/10): fixed fees and
 * pass-throughs are charged now; the provvigione (success fee) is charged only
 * when the deal completes.
 */

export type PaymentStatus =
  | 'REQUIRES_PAYMENT'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentEvent = 'CONFIRM' | 'SUCCEED' | 'FAIL' | 'REFUND' | 'RETRY';

export type PaymentPurpose = 'DUE_NOW' | 'PROVVIGIONE';

export type LineKind = 'fixed' | 'provvigione' | 'passthrough';

export interface OrderLine {
  code: string;
  kind: LineKind;
  imponibileCents: number;
  ivaRate: number; // e.g. 0.22; pass-through lines carry 0
}

export interface ChargePlan {
  /** Charged at order confirmation (fixed + pass-through, gross). */
  nowCents: number;
  /** Charged on deal success (provvigione, gross). */
  onSuccessCents: number;
}
