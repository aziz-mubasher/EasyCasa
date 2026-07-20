/**
 * The seam every module exposes so GDPR access/erasure can reach its data —
 * Phase 38. Each feature that stores personal data implements this and binds
 * under the multi-provider token.
 */
export interface CollectedData {
  /** Stable label for the section in the export (e.g. 'enquiries'). */
  source: string;
  /** The subject's records from this source, already personal-data-scoped. */
  records: unknown[];
}

export interface ErasureOutcome {
  source: string;
  erased: number;
  /** Records kept due to a legal obligation (e.g. concluded mediation / invoice). */
  retainedUnderLegalHold: number;
  note?: string;
}

export interface PersonalDataSource {
  /** Label used in exports/outcomes. */
  readonly source: string;
  /** Art. 15 — return everything held about the subject. */
  collect(subjectId: string): Promise<CollectedData>;
  /** Art. 17 — erase/anonymize, honoring legal holds. */
  erase(subjectId: string): Promise<ErasureOutcome>;
}

/** Multi-provider DI token: every source binds to this. */
export const PERSONAL_DATA_SOURCE = Symbol('PERSONAL_DATA_SOURCE');
