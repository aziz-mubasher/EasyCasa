import { Inject, Injectable } from '@nestjs/common';

/** A purpose the subject can consent to. Extend as the product grows. */
export type ConsentPurpose = 'privacy_policy' | 'mediation_disclosure' | 'marketing';

export interface ConsentRecord {
  subjectId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  policyVersion: string;
  at: string;
  /** Hash of the source IP — evidence without storing the raw address. */
  ipHash?: string;
}

/** Storage seam — real impl is a DB table; tests use in-memory. Append-only. */
export interface ConsentStore {
  append(record: ConsentRecord): Promise<void>;
  latest(subjectId: string, purpose: ConsentPurpose): Promise<ConsentRecord | null>;
  listForSubject(subjectId: string): Promise<ConsentRecord[]>;
}

export const CONSENT_STORE = Symbol('CONSENT_STORE');

/** Draft policy version stored with each consent until counsel publishes. */
export const CURRENT_POLICY_VERSION = 'v1-draft';

/** The consents the seeker flow requires before an enquiry is accepted. */
export const REQUIRED_ENQUIRY_CONSENTS: ConsentPurpose[] = [
  'privacy_policy',
  'mediation_disclosure',
];

/**
 * Consent capture & verification (GDPR Art. 7) — Phase 38. Records are append-
 * only (withdrawal is a new record with granted:false).
 */
@Injectable()
export class ConsentService {
  constructor(@Inject(CONSENT_STORE) private readonly store: ConsentStore) {}

  record(input: Omit<ConsentRecord, 'at'> & { at?: string }): Promise<void> {
    return this.store.append({ ...input, at: input.at ?? new Date().toISOString() });
  }

  async has(subjectId: string, purpose: ConsentPurpose): Promise<boolean> {
    const latest = await this.store.latest(subjectId, purpose);
    return Boolean(latest?.granted);
  }

  /** Returns the purposes still missing consent (empty ⇒ all present). */
  async missing(
    subjectId: string,
    purposes = REQUIRED_ENQUIRY_CONSENTS,
  ): Promise<ConsentPurpose[]> {
    const checks = await Promise.all(
      purposes.map(async (p) => [p, await this.has(subjectId, p)] as const),
    );
    return checks.filter(([, ok]) => !ok).map(([p]) => p);
  }
}
