/**
 * EC-10 — province coverage availability for catalogue items.
 *
 * An item is orderable in a province when at least one professional has the
 * required verified, non-expired credential and covers that province.
 * Capacity does not block availability — it only sets `capacityConstrained`.
 */

import { canAssign } from './eligibility';
import type { Professional, RequiredCredential } from './types';

export type CoverageUnavailableReason =
  | 'NO_PROVINCE'
  | 'NO_QUALIFIED_PROFESSIONAL'
  | 'ALL_EXPIRED_OR_UNVERIFIED'
  | 'OUT_OF_COVERAGE';

export interface ItemCoverageAvailability {
  available: boolean;
  /** True when at least one qualified pro exists but all are at max_concurrent. */
  capacityConstrained: boolean;
  /** Count of professionals who clear credential + coverage (capacity ignored). */
  qualifiedCount: number;
  /** Subset of qualifiedCount who also have spare capacity. */
  availableCapacityCount: number;
  reason?: CoverageUnavailableReason;
  reasonEn?: string;
  reasonIt?: string;
}

const REASON_COPY: Record<
  CoverageUnavailableReason,
  { en: string; it: string }
> = {
  NO_PROVINCE: {
    en: 'Province is required to check service availability.',
    it: 'La provincia è necessaria per verificare la disponibilità del servizio.',
  },
  NO_QUALIFIED_PROFESSIONAL: {
    en: 'No accredited professional is available in this province yet.',
    it: 'Non è ancora disponibile un professionista accreditato in questa provincia.',
  },
  ALL_EXPIRED_OR_UNVERIFIED: {
    en: 'No professional with a valid credential covers this province.',
    it: 'Nessun professionista con abilitazione valida copre questa provincia.',
  },
  OUT_OF_COVERAGE: {
    en: 'This service is not yet available in this province.',
    it: 'Questo servizio non è ancora disponibile in questa provincia.',
  },
};

/**
 * Pure coverage check for one catalogue item in one province.
 * Reuses {@link canAssign} but treats AT_CAPACITY as available+constrained.
 */
export function itemCoverageAvailability(
  requiredCredential: RequiredCredential,
  province: string | null | undefined,
  professionals: readonly Professional[],
  now: Date = new Date(),
): ItemCoverageAvailability {
  // Platform-operated items never need a professional or province.
  if (requiredCredential === 'NONE') {
    return {
      available: true,
      capacityConstrained: false,
      qualifiedCount: Number.POSITIVE_INFINITY,
      availableCapacityCount: Number.POSITIVE_INFINITY,
    };
  }

  const prov = String(province ?? '')
    .trim()
    .toUpperCase();
  if (!prov) {
    return {
      available: false,
      capacityConstrained: false,
      qualifiedCount: 0,
      availableCapacityCount: 0,
      reason: 'NO_PROVINCE',
      reasonEn: REASON_COPY.NO_PROVINCE.en,
      reasonIt: REASON_COPY.NO_PROVINCE.it,
    };
  }

  const task = { requiredCredential, province: prov };
  let qualifiedCount = 0;
  let availableCapacityCount = 0;
  let sawCoverageMiss = false;
  let sawCredentialMiss = false;

  for (const pro of professionals) {
    const result = canAssign(pro, task, now);
    const capacityOnly =
      !result.allowed &&
      result.blockers.length > 0 &&
      result.blockers.every((b) => b.code === 'AT_CAPACITY');

    if (result.allowed || capacityOnly) {
      qualifiedCount += 1;
      if (result.allowed) availableCapacityCount += 1;
      continue;
    }

    if (result.blockers.some((b) => b.code === 'OUT_OF_COVERAGE')) {
      sawCoverageMiss = true;
    }
    if (
      result.blockers.some((b) =>
        ['MISSING_CREDENTIAL', 'UNVERIFIED', 'EXPIRED', 'MISSING_INSURANCE', 'INSURANCE_EXPIRED'].includes(
          b.code,
        ),
      )
    ) {
      sawCredentialMiss = true;
    }
  }

  if (qualifiedCount > 0) {
    return {
      available: true,
      capacityConstrained: availableCapacityCount === 0,
      qualifiedCount,
      availableCapacityCount,
    };
  }

  const reason: CoverageUnavailableReason = sawCredentialMiss
    ? 'ALL_EXPIRED_OR_UNVERIFIED'
    : sawCoverageMiss
      ? 'OUT_OF_COVERAGE'
      : 'NO_QUALIFIED_PROFESSIONAL';

  return {
    available: false,
    capacityConstrained: false,
    qualifiedCount: 0,
    availableCapacityCount: 0,
    reason,
    reasonEn: REASON_COPY[reason].en,
    reasonIt: REASON_COPY[reason].it,
  };
}
