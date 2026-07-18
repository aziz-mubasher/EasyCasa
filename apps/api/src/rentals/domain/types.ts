/**
 * Rentals compliance domain — pure types.
 *
 * Covers the Italian lease lifecycle: contract-type rules, RLI registration
 * (Agenzia delle Entrate), the cedolare secca option, registration taxes, and
 * AML/KYC (D.Lgs 231/2007). All money in integer euro cents.
 */

export type LeaseType = 'LIBERO_4_4' | 'CONCORDATO_3_2' | 'TRANSITORIO' | 'STUDENTI';

/** Cedolare secca rate as a fraction (0 = not opted). */
export type CedolareRate = 0 | 0.1 | 0.21;

export interface LeaseTypeRule {
  type: LeaseType;
  labelEn: string;
  labelIt: string;
  minMonths: number;
  maxMonths: number;
  /** Whether this is a canone concordato figure (accordi territoriali). */
  concordato: boolean;
}

export interface LeaseInput {
  type: LeaseType;
  /** Contract start (decorrenza), ISO date. */
  startAt: string;
  durationMonths: number;
  annualRentCents: number;
  cedolareSecca: boolean;
  /** In a high-tension municipality (affects concordato 10% + registro base). */
  highTension: boolean;
  /** APE must be attached to a residential lease. */
  apeAttached: boolean;
  /** Signature date; registration clock is min(signedAt, startAt) + 30d. */
  signedAt?: string;
}

export type LeaseBlockerCode = 'APE_MISSING' | 'DURATION_OUT_OF_RANGE';
export type LeaseWarningCode = 'CEDOLARE_10_NEEDS_HIGH_TENSION' | 'ISTAT_WAIVED';

export interface LeaseIssue {
  code: LeaseBlockerCode | LeaseWarningCode;
  messageEn: string;
  messageIt: string;
}

export interface LeaseValidation {
  valid: boolean;
  cedolareRate: CedolareRate;
  blockers: LeaseIssue[];
  warnings: LeaseIssue[];
}

/* RLI ------------------------------------------------------------------ */

export type RliAdempimento =
  | 'REGISTRAZIONE'
  | 'PROROGA'
  | 'RISOLUZIONE'
  | 'CESSIONE'
  | 'ANNUALITA';

export interface RegistrationTaxes {
  cedolare: boolean;
  registroCents: number;
  bolloCents: number;
  totalCents: number;
  note: string;
}

export interface RliPayload {
  adempimento: RliAdempimento;
  leaseType: LeaseType;
  startAt: string;
  durationMonths: number;
  annualRentCents: number;
  cedolareSecca: boolean;
  cedolareRate: CedolareRate;
  registrationDeadline: string;
  taxes: RegistrationTaxes;
}

/* AML ------------------------------------------------------------------ */

export type AmlRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type AmlMeasure = 'ORDINARY' | 'ENHANCED';

export interface AmlFactors {
  pep: boolean;
  nonEuId: boolean;
  cashPayment: boolean;
  highValue: boolean;
  identityMismatch: boolean;
  sanctionsHit: boolean;
}

export interface AmlAssessment {
  level: AmlRiskLevel;
  measure: AmlMeasure;
  /** True when a suspicious-operation report (SOS to UIF) path is required. */
  mustEscalate: boolean;
  score: number;
}

export type KycStatus = 'OPEN' | 'VERIFIED' | 'ESCALATED' | 'CLEARED';
export type KycEvent = 'VERIFY' | 'ESCALATE' | 'CLEAR' | 'REOPEN';
