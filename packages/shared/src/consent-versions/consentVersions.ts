/**
 * EC-S-T30 — seller informativa / consent policy version helpers.
 *
 * Pure decision logic for the consent acceptance ledger. Nest wires these to
 * `seller_profile.informativa_version_accepted` (current pointer) and
 * append-only `consent_acceptance_log`.
 *
 * Version grammar: optional `v` prefix + major.minor integers (e.g. `v1.0`,
 * `2.13`). Draft / empty / free-form strings (`v1-draft`) are rejected.
 */

export type ConsentDecision =
  | 'ok'
  | 'notice'
  | 'reacceptance_required'
  | 'invalid';

export type ParsedPolicyVersion = {
  major: number;
  minor: number;
};

/** Strict policy version: `v1.0` / `2.13`. Rejects drafts and empty strings. */
const POLICY_VERSION_RE = /^v?(\d+)\.(\d+)$/;

export function parsePolicyVersion(raw: string): ParsedPolicyVersion | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const m = POLICY_VERSION_RE.exec(trimmed);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]) };
}

/**
 * Compare the version the subject last accepted against the current published
 * informativa version.
 *
 * - same → ok
 * - minor bump (same major, current.minor > accepted.minor) → notice
 * - major bump → reacceptance_required
 * - accepted newer than current → invalid
 * - either side unparseable → invalid
 */
export function consentDecision(
  acceptedVersion: string | null | undefined,
  currentVersion: string | null | undefined,
): ConsentDecision {
  const accepted = parsePolicyVersion(acceptedVersion ?? '');
  const current = parsePolicyVersion(currentVersion ?? '');
  if (!accepted || !current) return 'invalid';

  if (accepted.major === current.major && accepted.minor === current.minor) {
    return 'ok';
  }
  if (accepted.major > current.major) return 'invalid';
  if (accepted.major < current.major) return 'reacceptance_required';
  // same major
  if (accepted.minor > current.minor) return 'invalid';
  return 'notice'; // accepted.minor < current.minor
}

/** ok and notice may proceed; reacceptance_required and invalid must not. */
export function mayProceed(decision: ConsentDecision): boolean {
  return decision === 'ok' || decision === 'notice';
}

export type ConsentAcceptance = {
  policyVersion: string;
  acceptedAt: Date;
};

/**
 * Build an acceptance record for the ledger write path.
 * Refuses (returns null) when the policy version is unparseable.
 */
export function buildAcceptance(
  policyVersion: string,
  acceptedAt: Date = new Date(),
): ConsentAcceptance | null {
  const trimmed = typeof policyVersion === 'string' ? policyVersion.trim() : '';
  if (!parsePolicyVersion(trimmed)) return null;
  return { policyVersion: trimmed, acceptedAt };
}
