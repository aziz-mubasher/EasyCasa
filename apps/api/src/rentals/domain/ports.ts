import type {
  AmlAssessment,
  AmlFactors,
  KycStatus,
  LeaseInput,
  RliAdempimento,
  RliPayload,
} from './types';

export interface LeaseRecord extends LeaseInput {
  id: string;
  propertyId: string;
  registrationProtocollo: string | null;
  registeredAt: string | null;
}

export interface LeaseRepository {
  create(propertyId: string, input: LeaseInput): Promise<LeaseRecord>;
  get(id: string): Promise<LeaseRecord | null>;
  setRegistration(id: string, protocollo: string, registeredAt: string): Promise<void>;
  listDueBy(isoDate: string): Promise<LeaseRecord[]>;
}

/**
 * RLI telematic channel (Agenzia delle Entrate). Submission runs through an
 * authorised channel (Entratel/RLI-web, SPID/CIE) — not an open REST API. This
 * port is the integration seam; the domain builds the validated payload.
 */
export interface RliChannel {
  submit(payload: RliPayload): Promise<{ protocollo: string; registeredAt: string }>;
}

/** PEP / sanctions screening provider. */
export interface AmlScreeningProvider {
  screen(subject: { fullName: string; countryCode: string }): Promise<{
    pep: boolean;
    sanctionsHit: boolean;
  }>;
}

export interface KycCaseRecord {
  id: string;
  subjectRef: string;
  factors: AmlFactors;
  assessment: AmlAssessment;
  status: KycStatus;
}

export interface KycRepository {
  create(input: {
    subjectRef: string;
    factors: AmlFactors;
    assessment: AmlAssessment;
    status: KycStatus;
  }): Promise<KycCaseRecord>;
  get(id: string): Promise<KycCaseRecord | null>;
  setStatus(id: string, status: KycStatus): Promise<void>;
  hasOpenEscalation(subjectRef: string): Promise<boolean>;
}

export type { RliAdempimento };
