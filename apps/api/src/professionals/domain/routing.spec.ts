import { describe, expect, it } from 'vitest';

import { bestCandidate, selectCandidates } from './routing';
import { AssignmentTransitionError, nextAssignmentStatus } from './state';
import type { Credential, Professional, TaskContext } from './types';

const NOW = new Date('2026-07-17T00:00:00Z');
const ins: Credential = { type: 'RC_INSURANCE', status: 'VERIFIED', expiresAt: '2027-01-01' };
const rea: Credential = { type: 'REA_MEDIATORE', status: 'VERIFIED' };

function mediator(id: string, load: number, provinces = ['MI']): Professional {
  return {
    id,
    coverageProvinces: provinces,
    credentials: [rea, ins],
    activeAssignments: load,
    maxConcurrent: 5,
  };
}

const task: TaskContext = { requiredCredential: 'REA_MEDIATORE', province: 'MI' };

describe('routing', () => {
  it('selectCandidates returns only eligible pros, sorted by load', () => {
    const pros = [
      mediator('busy', 4),
      mediator('free', 0),
      mediator('mid', 2),
      {
        id: 'noins',
        coverageProvinces: ['MI'],
        credentials: [rea],
        activeAssignments: 0,
        maxConcurrent: 5,
      },
      mediator('elsewhere', 0, ['RM']),
    ];
    const candidates = selectCandidates(task, pros, NOW);
    expect(candidates.map((c) => c.professional.id)).toEqual(['free', 'mid', 'busy']);
  });

  it('bestCandidate picks the least-loaded eligible pro', () => {
    const best = bestCandidate(task, [mediator('a', 3), mediator('b', 1)], NOW);
    expect(best?.id).toBe('b');
  });

  it('bestCandidate returns null when none eligible', () => {
    const best = bestCandidate(task, [mediator('x', 0, ['RM'])], NOW);
    expect(best).toBeNull();
  });
});

describe('assignment state machine', () => {
  it('REQUESTED → ASSIGNED → IN_PROGRESS → DELIVERED → APPROVED', () => {
    expect(nextAssignmentStatus('REQUESTED', 'ASSIGN')).toBe('ASSIGNED');
    expect(nextAssignmentStatus('ASSIGNED', 'START')).toBe('IN_PROGRESS');
    expect(nextAssignmentStatus('IN_PROGRESS', 'DELIVER')).toBe('DELIVERED');
    expect(nextAssignmentStatus('DELIVERED', 'APPROVE')).toBe('APPROVED');
  });

  it('reject sends a delivery back to in-progress', () => {
    expect(nextAssignmentStatus('DELIVERED', 'REJECT')).toBe('IN_PROGRESS');
  });

  it('reassign returns to the pool', () => {
    expect(nextAssignmentStatus('ASSIGNED', 'REASSIGN')).toBe('REQUESTED');
    expect(nextAssignmentStatus('IN_PROGRESS', 'REASSIGN')).toBe('REQUESTED');
  });

  it('illegal transitions throw', () => {
    expect(() => nextAssignmentStatus('REQUESTED', 'DELIVER')).toThrow(AssignmentTransitionError);
    expect(() => nextAssignmentStatus('APPROVED', 'REJECT')).toThrow(AssignmentTransitionError);
  });
});
