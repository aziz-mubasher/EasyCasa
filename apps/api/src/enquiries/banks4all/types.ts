/** Minimal attestation returned by Banks4All B4A-1 (partner verify). */
export interface Banks4AllAttestation {
  status: 'valid';
  bandMaxCents: number;
  /** Inclusive expiry date, YYYY-MM-DD. */
  expiresAt: string;
  /** e.g. "M.R." — compared to EasyCasa account initials. */
  holderInitials: string;
}

export type Banks4AllVerifyOutcome =
  | { ok: true; attestation: Banks4AllAttestation }
  | { ok: false; reason: 'not_found' | 'unavailable' };

/** Ephemeral create-response hints — not persisted. */
export type Banks4AllAttachWarning =
  | 'plan_ref'
  | 'initials_mismatch'
  | 'consent_required'
  | 'unresolved';
