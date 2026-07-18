import type {
  AmlAssessment,
  AmlFactors,
  AmlRiskLevel,
  KycEvent,
  KycStatus,
} from './types';

/**
 * Adeguata verifica della clientela (D.Lgs 231/2007). A simple, explainable
 * risk score drives the level; a sanctions hit forces HIGH and escalation. This
 * is a screening aid, not a substitute for a compliance officer's judgement.
 */
export function assessAmlRisk(factors: AmlFactors): AmlAssessment {
  let score = 0;
  if (factors.pep) score += 2;
  if (factors.identityMismatch) score += 2;
  if (factors.nonEuId) score += 1;
  if (factors.cashPayment) score += 1;
  if (factors.highValue) score += 1;

  let level: AmlRiskLevel;
  if (factors.sanctionsHit || score >= 4) level = 'HIGH';
  else if (score >= 2) level = 'MEDIUM';
  else level = 'LOW';

  return {
    level,
    measure: level === 'HIGH' ? 'ENHANCED' : 'ORDINARY',
    mustEscalate: factors.sanctionsHit,
    score,
  };
}

export class KycTransitionError extends Error {}

const KYC: Readonly<Record<KycStatus, Partial<Record<KycEvent, KycStatus>>>> = {
  OPEN: { VERIFY: 'VERIFIED', ESCALATE: 'ESCALATED' },
  VERIFIED: { CLEAR: 'CLEARED', ESCALATE: 'ESCALATED' },
  ESCALATED: { CLEAR: 'CLEARED', REOPEN: 'OPEN' },
  CLEARED: { REOPEN: 'OPEN' },
};

/**
 * Advance a KYC case. When escalation is required (e.g. a sanctions hit), the
 * case cannot be VERIFIED directly — it must be ESCALATED first (SOS to UIF).
 */
export function nextKycStatus(
  current: KycStatus,
  event: KycEvent,
  opts: { mustEscalate?: boolean } = {},
): KycStatus {
  if (event === 'VERIFY' && opts.mustEscalate === true) {
    throw new KycTransitionError('Case must be escalated (SOS) before it can be verified');
  }
  const next = KYC[current][event];
  if (!next) throw new KycTransitionError(`Illegal KYC transition: ${event} from ${current}`);
  return next;
}
