/**
 * Fascicolo domain — pure types. No framework, no ORM.
 *
 * The "fascicolo dell'immobile" is the document set a property must carry.
 * Italian rules turn parts of it into hard gates: no APE → cannot publish;
 * catastal/urbanistic non-conformity → cannot reach the rogito. This module
 * models those rules as data so the service layer can evaluate them.
 */

/** Which transaction the property is being prepared for. */
export type DealType = 'sale' | 'rent';

/** The gates the engine can evaluate. */
export type Gate = 'PUBLISH' | 'CLOSE' | 'REGISTER_LEASE';

/** Canonical document codes in the fascicolo. */
export type DocumentCode =
  | 'ATTO_PROVENIENZA'
  | 'VISURA_CATASTALE'
  | 'PLANIMETRIA_CATASTALE'
  | 'CONFORMITA_URBANISTICA_RTI'
  | 'APE'
  | 'AGIBILITA'
  | 'CONFORMITA_IMPIANTI'
  | 'DOC_CONDOMINIALE'
  | 'IDENTITY';

/** How a document requirement behaves for a given gate. */
export type Requirement = 'required' | 'conditional' | 'recommended';

export interface DocumentTypeDef {
  code: DocumentCode;
  labelEn: string;
  labelIt: string;
  /** Whether a licensed professional's deliverable is what satisfies this. */
  professionalDeliverable: boolean;
  /** Validity window in months; undefined = does not expire. */
  validityMonths?: number;
  /** Per-gate requirement level. Absent gate = not relevant to that gate. */
  gates: Partial<Record<Gate, Requirement>>;
  /**
   * If set, the requirement only applies when this property flag is true
   * (e.g. condominium documents only in a condominio).
   */
  onlyWhen?: 'inCondominio';
}

/** A document actually attached to a property. */
export interface DocumentInstance {
  code: DocumentCode;
  /** ISO date the document was issued; used for validity windows. */
  issuedAt?: string;
  /** Ops/professional verification timestamp; unverified docs don't satisfy gates. */
  verifiedAt?: string;
}

export interface PropertyContext {
  dealType: DealType;
  inCondominio: boolean;
  documents: DocumentInstance[];
}

export type BlockerCode = 'MISSING' | 'EXPIRED' | 'UNVERIFIED';

export interface Blocker {
  document: DocumentCode;
  code: BlockerCode;
  messageEn: string;
  messageIt: string;
}

export interface GateResult {
  gate: Gate;
  allowed: boolean;
  blockers: Blocker[];
  warnings: Blocker[];
}

export interface FascicoloEvaluation {
  publish: GateResult;
  close: GateResult;
  registerLease: GateResult;
}
