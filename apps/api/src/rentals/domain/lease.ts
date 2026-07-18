import type {
  CedolareRate,
  LeaseInput,
  LeaseIssue,
  LeaseType,
  LeaseTypeRule,
  LeaseValidation,
} from './types';

/**
 * Contract-type rules (residential). Durations reflect Italian law:
 *  - 4+4 libero: 4-year initial term
 *  - 3+2 concordato: 3-year initial term (canone concordato)
 *  - transitorio: 1–18 months
 *  - studenti: 6–36 months
 */
export const LEASE_RULES: Readonly<Record<LeaseType, LeaseTypeRule>> = {
  LIBERO_4_4: { type: 'LIBERO_4_4', labelEn: 'Free-market 4+4', labelIt: 'Canone libero 4+4', minMonths: 48, maxMonths: 48, concordato: false },
  CONCORDATO_3_2: { type: 'CONCORDATO_3_2', labelEn: 'Agreed-rent 3+2', labelIt: 'Canone concordato 3+2', minMonths: 36, maxMonths: 36, concordato: true },
  TRANSITORIO: { type: 'TRANSITORIO', labelEn: 'Transitory', labelIt: 'Transitorio', minMonths: 1, maxMonths: 18, concordato: false },
  STUDENTI: { type: 'STUDENTI', labelEn: 'University students', labelIt: 'Studenti universitari', minMonths: 6, maxMonths: 36, concordato: true },
};

/**
 * Cedolare secca rate for a chosen lease. 10% applies to canone concordato and
 * to student contracts; a transitorio only reaches 10% when it's the agevolato
 * variant in a high-tension municipality — otherwise 21%. Returns 0 if the
 * owner did not opt in.
 */
export function cedolareRateFor(input: LeaseInput): CedolareRate {
  if (!input.cedolareSecca) return 0;
  switch (input.type) {
    case 'CONCORDATO_3_2':
    case 'STUDENTI':
      return 0.1;
    case 'TRANSITORIO':
      return input.highTension ? 0.1 : 0.21;
    case 'LIBERO_4_4':
    default:
      return 0.21;
  }
}

function issue(
  code: LeaseIssue['code'],
  en: string,
  it: string,
): LeaseIssue {
  return { code, messageEn: en, messageIt: it };
}

export function validateLease(input: LeaseInput): LeaseValidation {
  const rule = LEASE_RULES[input.type];
  const blockers: LeaseIssue[] = [];
  const warnings: LeaseIssue[] = [];

  if (!input.apeAttached) {
    blockers.push(
      issue('APE_MISSING', 'APE must be attached to the lease.', 'L’APE deve essere allegato al contratto.'),
    );
  }

  if (input.durationMonths < rule.minMonths || input.durationMonths > rule.maxMonths) {
    blockers.push(
      issue(
        'DURATION_OUT_OF_RANGE',
        `Duration must be ${rule.minMonths}–${rule.maxMonths} months for ${rule.labelEn}.`,
        `La durata deve essere ${rule.minMonths}–${rule.maxMonths} mesi per ${rule.labelIt}.`,
      ),
    );
  }

  const cedolareRate = cedolareRateFor(input);

  if (input.cedolareSecca && input.type === 'TRANSITORIO' && !input.highTension) {
    warnings.push(
      issue(
        'CEDOLARE_10_NEEDS_HIGH_TENSION',
        'Transitory lease reaches the 10% rate only as agevolato in a high-tension municipality; 21% applies here.',
        'Il transitorio raggiunge il 10% solo se agevolato in Comune ad alta tensione abitativa; qui si applica il 21%.',
      ),
    );
  }

  if (input.cedolareSecca) {
    warnings.push(
      issue(
        'ISTAT_WAIVED',
        'Choosing cedolare secca waives ISTAT rent adjustments for the option period.',
        'Con la cedolare secca si rinuncia all’adeguamento ISTAT del canone per la durata dell’opzione.',
      ),
    );
  }

  return { valid: blockers.length === 0, cedolareRate, blockers, warnings };
}
