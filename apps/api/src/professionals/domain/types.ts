/**
 * Professionals & assignment domain — pure types.
 *
 * The regulated core: a task can only be assigned to a professional who holds
 * the right *verified, non-expired* credential — and for mediation, also valid
 * RC professional insurance (Legge 39/1989). This is data-driven and testable;
 * the assignment engine refuses anything that doesn't clear the gate.
 */

export type CredentialType =
  | 'REA_MEDIATORE' // agente in mediazione, REA enrolment (L. 39/1989)
  | 'RC_INSURANCE' // mandatory professional liability insurance
  | 'ALBO_TECNICO' // geometra / architetto / ingegnere — conformity (RTI)
  | 'APE_CERTIFIER' // certified energy assessor — APE
  | 'PHOTOGRAPHER' // media (unregulated role)
  | 'NOTAIO'; // rogito

/** What a task requires. RC_INSURANCE is implied by REA_MEDIATORE, not requested directly. */
export type RequiredCredential = Exclude<CredentialType, 'RC_INSURANCE'> | 'NONE';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface Credential {
  type: CredentialType;
  status: VerificationStatus;
  /** REA number, albo registration, policy number, etc. */
  reference?: string;
  /** For time-bound credentials (insurance, some enrolments). */
  expiresAt?: string;
}

export interface Professional {
  id: string;
  /** Provinces (sigla, e.g. "MI", "RM") the professional covers. */
  coverageProvinces: string[];
  credentials: Credential[];
  activeAssignments: number;
  maxConcurrent: number;
}

export interface TaskContext {
  requiredCredential: RequiredCredential;
  /** Province the property is in. */
  province: string;
}

export type EligibilityBlockerCode =
  | 'MISSING_CREDENTIAL'
  | 'UNVERIFIED'
  | 'EXPIRED'
  | 'MISSING_INSURANCE'
  | 'INSURANCE_EXPIRED'
  | 'OUT_OF_COVERAGE'
  | 'AT_CAPACITY';

export interface EligibilityBlocker {
  code: EligibilityBlockerCode;
  messageEn: string;
  messageIt: string;
}

export interface Eligibility {
  allowed: boolean;
  blockers: EligibilityBlocker[];
}

export type AssignmentStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'APPROVED';

export type AssignmentEvent = 'ASSIGN' | 'START' | 'DELIVER' | 'APPROVE' | 'REJECT' | 'REASSIGN';
