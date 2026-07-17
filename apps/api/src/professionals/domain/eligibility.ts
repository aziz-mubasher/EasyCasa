import type {
  Credential,
  Eligibility,
  EligibilityBlocker,
  EligibilityBlockerCode,
  Professional,
  TaskContext,
} from './types';

const MESSAGES: Record<EligibilityBlockerCode, { en: string; it: string }> = {
  MISSING_CREDENTIAL: { en: 'Required credential is missing.', it: 'Manca l’abilitazione richiesta.' },
  UNVERIFIED: { en: 'Credential is not verified.', it: 'Abilitazione non verificata.' },
  EXPIRED: { en: 'Credential has expired.', it: 'Abilitazione scaduta.' },
  MISSING_INSURANCE: {
    en: 'Professional liability insurance is missing.',
    it: 'Manca la polizza RC professionale.',
  },
  INSURANCE_EXPIRED: {
    en: 'Professional liability insurance has expired.',
    it: 'La polizza RC professionale è scaduta.',
  },
  OUT_OF_COVERAGE: { en: 'Property is outside coverage area.', it: 'Immobile fuori dall’area di competenza.' },
  AT_CAPACITY: { en: 'Professional is at capacity.', it: 'Professionista al massimo del carico.' },
};

function blocker(code: EligibilityBlockerCode): EligibilityBlocker {
  return { code, messageEn: MESSAGES[code].en, messageIt: MESSAGES[code].it };
}

function credentialOf(pro: Professional, type: Credential['type']): Credential | undefined {
  return pro.credentials.find((c) => c.type === type);
}

function isValid(cred: Credential | undefined, now: Date): 'ok' | 'missing' | 'unverified' | 'expired' {
  if (!cred) return 'missing';
  if (cred.status !== 'VERIFIED') return 'unverified';
  if (cred.expiresAt && new Date(cred.expiresAt).getTime() < now.getTime()) return 'expired';
  return 'ok';
}

/**
 * Decide whether a professional may take a task. Checks coverage, capacity, the
 * required credential, and — for mediation — mandatory RC insurance. Pure and
 * deterministic; `now` is injected.
 */
export function canAssign(
  pro: Professional,
  task: TaskContext,
  now: Date = new Date(),
): Eligibility {
  const blockers: EligibilityBlocker[] = [];

  if (!pro.coverageProvinces.includes(task.province)) blockers.push(blocker('OUT_OF_COVERAGE'));
  if (pro.activeAssignments >= pro.maxConcurrent) blockers.push(blocker('AT_CAPACITY'));

  if (task.requiredCredential !== 'NONE') {
    const status = isValid(credentialOf(pro, task.requiredCredential), now);
    if (status === 'missing') blockers.push(blocker('MISSING_CREDENTIAL'));
    else if (status === 'unverified') blockers.push(blocker('UNVERIFIED'));
    else if (status === 'expired') blockers.push(blocker('EXPIRED'));

    // Mediation additionally requires valid RC professional insurance.
    if (task.requiredCredential === 'REA_MEDIATORE') {
      const ins = isValid(credentialOf(pro, 'RC_INSURANCE'), now);
      if (ins === 'missing') blockers.push(blocker('MISSING_INSURANCE'));
      else if (ins !== 'ok') blockers.push(blocker('INSURANCE_EXPIRED'));
    }
  }

  return { allowed: blockers.length === 0, blockers };
}
