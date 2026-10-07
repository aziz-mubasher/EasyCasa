import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ProAssignment } from '@easycasa/api-client';
import {
  ACCEPTED_CREDENTIAL_TYPES,
  isAcceptedCredentialType,
  isMediazioneAssignment,
  listableAssignments,
} from './assignment-filter.ts';

function assignment(
  itemCode: string,
  requiredCredential: string,
): ProAssignment {
  return {
    id: itemCode,
    taskId: itemCode,
    status: 'ASSIGNED',
    deliverableUrl: null,
    task: { itemCode, propertyId: 'p', requiredCredential, province: 'BS' },
  };
}

describe('assignment filter', () => {
  it('drops mediator enrolment and mediation catalogue codes', () => {
    const rows = [
      assignment('CONFORMITY_SURVEY', 'ALBO_TECNICO'),
      assignment('APE_ISSUANCE', 'CENED_ACCREDITAMENTO'),
      assignment('MEDIA_PACK', 'PHOTOGRAPHER'),
      assignment('VIRTUAL_TOUR', 'PHOTOGRAPHER'),
      assignment('ROGITO_COORDINATION', 'NOTAIO'),
      assignment('DOC_CHECKUP', 'NONE'),
      assignment('FULL_MEDIATION', 'REA_MEDIATORE'),
      assignment('BUYER_MEDIATION', 'NONE'),
      assignment('VIEWING_ACCOMPANIMENT', 'NONE'),
      assignment('OFFER_DRAFTING', 'NONE'),
    ];
    const listed = listableAssignments(rows).map((row) => row.task?.itemCode);
    assert.deepEqual(listed, [
      'CONFORMITY_SURVEY',
      'APE_ISSUANCE',
      'MEDIA_PACK',
      'VIRTUAL_TOUR',
      'ROGITO_COORDINATION',
      'DOC_CHECKUP',
    ]);
    assert.equal(isMediazioneAssignment(rows[6]!), true);
  });

  it('does not accept a mediator credential submission', () => {
    assert.equal(isAcceptedCredentialType('REA_MEDIATORE'), false);
    assert.equal(ACCEPTED_CREDENTIAL_TYPES.includes('ALBO_TECNICO'), true);
    assert.equal(ACCEPTED_CREDENTIAL_TYPES.includes('PHOTOGRAPHER'), true);
    assert.equal(ACCEPTED_CREDENTIAL_TYPES.includes('NOTAIO'), true);
    assert.equal(ACCEPTED_CREDENTIAL_TYPES.includes('APE_CERTIFIER'), true);
  });
});
