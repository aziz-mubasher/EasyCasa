/** EC-TRIAL-1 — score + decision. Phase 0/1 always return ALLOW unless enforcement is on. */

export const TRIAL_DECISIONS = ['ALLOW', 'REVIEW', 'HOLD'] as const;
export type TrialDecision = (typeof TRIAL_DECISIONS)[number];

export const TRIAL_LEDGER_REASONS = {
  trial: 'first_file_free',
  purchase: 'stripe_purchase',
  spend: 'report_unlock',
  adjustment: 'admin_adjust',
} as const;

export type TrialLedgerReason = (typeof TRIAL_LEDGER_REASONS)[keyof typeof TRIAL_LEDGER_REASONS];

export const TRIAL_SIGNAL_WEIGHTS = {
  DISPOSABLE_DOMAIN: 60,
  IP_BUCKET_2ND: 15,
  IP_BUCKET_3RD: 30,
  IP_BUCKET_4TH_PLUS: 55,
  DATACENTRE_OR_VPN_ASN: 25,
  SIGNUP_TO_UPLOAD_UNDER_20S: 20,
  UA_SEEN_ON_OTHER_TRIAL_24H: 20,
  HEADLESS_MARKERS: 40,
} as const;

export type TrialSignalCode = keyof typeof TRIAL_SIGNAL_WEIGHTS;

export const TRIAL_SCORE_REVIEW = 50;
export const TRIAL_SCORE_HOLD = 80;

export type TrialDecisionInput = {
  emailVerified: boolean;
  /** Phase 2 flag. Off → every scored path returns ALLOW. */
  enforcement: boolean;
  signals: readonly TrialSignalCode[];
};

export type TrialDecisionResult = {
  decision: TrialDecision;
  score: number;
  reasons: TrialSignalCode[];
  /** Gate, not a weight. Unverified never receives a credit. */
  grantCredit: boolean;
};

export function scoreTrialSignals(signals: readonly TrialSignalCode[]): {
  score: number;
  reasons: TrialSignalCode[];
} {
  const reasons = [...new Set(signals)];
  const score = reasons.reduce((sum, code) => sum + TRIAL_SIGNAL_WEIGHTS[code], 0);
  return { score, reasons };
}

/**
 * Email verification is a gate, not a weight.
 * REVIEW still grants. HOLD never fires from a single signal.
 * Feature flag off → ALLOW (Phase 0 / Phase 1 shadow).
 */
export function decideTrial(input: TrialDecisionInput): TrialDecisionResult {
  const { score, reasons } = scoreTrialSignals(input.signals);
  if (!input.emailVerified) {
    return { decision: 'ALLOW', score, reasons, grantCredit: false };
  }
  if (!input.enforcement) {
    return { decision: 'ALLOW', score, reasons, grantCredit: true };
  }

  let decision: TrialDecision = 'ALLOW';
  if (score >= TRIAL_SCORE_HOLD && reasons.length >= 2) {
    decision = 'HOLD';
  } else if (score >= TRIAL_SCORE_REVIEW) {
    decision = 'REVIEW';
  }

  return {
    decision,
    score,
    reasons,
    grantCredit: decision !== 'HOLD',
  };
}

/** Payload written to logs / analytics. Never include IP, email, or domain. */
export function trialLogPayload(input: {
  event: string;
  userId?: string;
  decision: TrialDecision;
  score: number;
  reasons: readonly string[];
  granted: boolean;
  bucketHash?: string | null;
}): Record<string, unknown> {
  return {
    event: input.event,
    userId: input.userId,
    decision: input.decision,
    score: input.score,
    reasons: [...input.reasons],
    granted: input.granted,
    bucketHashPrefix: input.bucketHash ? input.bucketHash.slice(0, 8) : null,
  };
}

export function trialLogContainsForbidden(payload: unknown, rawIp: string, email?: string): boolean {
  const text = JSON.stringify(payload);
  if (rawIp && text.includes(rawIp)) return true;
  if (email) {
    const at = email.lastIndexOf('@');
    const domain = at >= 0 ? email.slice(at + 1) : '';
    if (email && text.includes(email)) return true;
    if (domain && domain.includes('.') && text.includes(domain)) return true;
  }
  return false;
}
