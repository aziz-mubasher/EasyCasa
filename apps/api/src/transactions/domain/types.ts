/**
 * Transactions domain — pure types shared by orders and mandate.
 *
 * The legal-basis classification is the crux: whether a service is charged as
 * neutral *mediazione* or as a paid *mandato a titolo oneroso* changes how (and
 * from whom) a fee may lawfully be taken. We do NOT decide this in code — each
 * catalog item carries an admin-configured `LegalBasis`, defaulting to
 * REVIEW_REQUIRED so nothing is silently mischaracterised, and the mandate
 * cannot be sent while any item is unreviewed.
 */

export type LegalBasis = 'MEDIAZIONE' | 'MANDATO_ONEROSO' | 'REVIEW_REQUIRED';

/** A resolved mandate figure (REVIEW_REQUIRED is never a resolved type). */
export type MandateType = 'MEDIAZIONE' | 'MANDATO_ONEROSO';

export type MandateStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'WITHDRAWN' | 'EXPIRED';
export type MandateEvent = 'SEND' | 'SIGN' | 'WITHDRAW' | 'EXPIRE';

export type OrderStatus = 'QUOTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type OrderEvent = 'CONFIRM' | 'START' | 'COMPLETE' | 'CANCEL';

export interface QuoteRequest {
  items?: string[];
  packageCode?: string;
  referenceValueCents?: number;
}

/** Structural mirror of the Phase 8 Quote (kept decoupled from the pricing pkg). */
export interface QuoteLine {
  code: string;
  labelEn: string;
  labelIt: string;
  kind: 'fixed' | 'provvigione' | 'passthrough' | 'bundle';
  netCents: number;
  ivaCents: number;
  grossCents: number;
  estimated: boolean;
  note?: string;
}

export interface QuoteResult {
  lines: QuoteLine[];
  fixedNetCents: number;
  provvigioneEstimatedNetCents: number;
  passthroughCents: number;
  ivaCents: number;
  dueNowGrossCents: number;
  estimatedTotalGrossCents: number;
  currency: 'EUR';
}

export interface MandateDerivation {
  /** Distinct mandate figures implied by the order's items. */
  types: MandateType[];
  /** Item codes whose legal basis is unset/under review — these BLOCK sending. */
  reviewRequiredItems: string[];
  /** True only when every item is classified and at least one type is present. */
  canProceed: boolean;
}

export interface MandateTerms {
  exclusive: boolean;
  durationMonths: number;
}
