import type { ProAssignment, ProCredential } from '@easycasa/api-client';

/**
 * Assignment types the professional stack may list and accept.
 * Mediazione work (mediator enrolment, or a mediation catalogue code) is excluded.
 *
 * Remaining credential gates, from the API default policy:
 * ALBO_TECNICO (CONFORMITY_SURVEY), CENED_ACCREDITAMENTO / APE_CERTIFIER (APE),
 * PHOTOGRAPHER (MEDIA_PACK, VIRTUAL_TOUR), NOTAIO (ROGITO_COORDINATION), NONE.
 */
const MEDIATOR_CREDENTIAL = 'REA_MEDIATORE';

const MEDIATION_ITEM_CODES = new Set([
  'FULL_MEDIATION',
  'BUYER_MEDIATION',
  'VIEWING_ACCOMPANIMENT',
  'OFFER_DRAFTING',
]);

export const ACCEPTED_CREDENTIAL_TYPES: readonly ProCredential['type'][] = [
  'RC_INSURANCE',
  'ALBO_TECNICO',
  'APE_CERTIFIER',
  'PHOTOGRAPHER',
  'NOTAIO',
];

export function isMediazioneAssignment(
  assignment: Pick<ProAssignment, 'task'>,
): boolean {
  const task = assignment.task;
  if (!task) return false;
  if (task.requiredCredential === MEDIATOR_CREDENTIAL) return true;
  return MEDIATION_ITEM_CODES.has(task.itemCode);
}

export function listableAssignments(assignments: readonly ProAssignment[]): ProAssignment[] {
  return assignments.filter((assignment) => !isMediazioneAssignment(assignment));
}

export function isAcceptedCredentialType(type: ProCredential['type']): boolean {
  return (ACCEPTED_CREDENTIAL_TYPES as readonly string[]).includes(type);
}
