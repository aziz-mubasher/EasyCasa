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
  | 'RC_INSURANCE' // mandatory professional liability insurance (legacy name)
  | 'RC_PROFESSIONALE' // EC-13 alias of RC_INSURANCE
  | 'ALBO_TECNICO' // geometra / architetto / ingegnere — conformity (RTI)
  | 'ALBO_ISCRIZIONE' // EC-13 albo enrolment (treated as ALBO_TECNICO for gates)
  | 'APE_CERTIFIER' // certified energy assessor — APE (legacy)
  | 'CENED_ACCREDITAMENTO' // EC-13 Lombardy CENED — blocks APE_ISSUANCE when missing
  | 'PARTITA_IVA' // EC-13 VAT registration
  | 'PHOTOGRAPHER' // media (unregulated role)
  | 'NOTAIO'; // rogito

/** What a task requires. RC_* is implied by REA_MEDIATORE, not requested directly. */
export type RequiredCredential =
  | Exclude<
      CredentialType,
      'RC_INSURANCE' | 'RC_PROFESSIONALE' | 'PARTITA_IVA'
    >
  | 'NONE';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface Credential {
  type: CredentialType;
  status: VerificationStatus;
  /** REA number, albo registration, policy number, etc. */
  reference?: string;
  /** For time-bound credentials (insurance, some enrolments). */
  expiresAt?: string;
  /** Supporting document URL (EC-13). */
  documentUrl?: string;
}

export interface Professional {
  id: string;
  displayName: string;
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

/** Types that satisfy a required credential (EC-13 aliases). */
export function credentialTypeAliases(required: CredentialType | RequiredCredential): CredentialType[] {
  if (required === 'NONE') return [];
  if (required === 'APE_CERTIFIER' || required === 'CENED_ACCREDITAMENTO') {
    return ['APE_CERTIFIER', 'CENED_ACCREDITAMENTO'];
  }
  if (required === 'ALBO_TECNICO' || required === 'ALBO_ISCRIZIONE') {
    return ['ALBO_TECNICO', 'ALBO_ISCRIZIONE'];
  }
  if (required === 'RC_INSURANCE' || required === 'RC_PROFESSIONALE') {
    return ['RC_INSURANCE', 'RC_PROFESSIONALE'];
  }
  return [required as CredentialType];
}
