import type { AssignmentEvent, AssignmentStatus } from './types';

export class AssignmentTransitionError extends Error {}

const TRANSITIONS: Readonly<
  Record<AssignmentStatus, Partial<Record<AssignmentEvent, AssignmentStatus>>>
> = {
  REQUESTED: { ASSIGN: 'ASSIGNED' },
  ASSIGNED: { START: 'IN_PROGRESS', REASSIGN: 'REQUESTED' },
  IN_PROGRESS: { DELIVER: 'DELIVERED', REASSIGN: 'REQUESTED' },
  DELIVERED: { APPROVE: 'APPROVED', REJECT: 'IN_PROGRESS' },
  APPROVED: {},
};

export function nextAssignmentStatus(
  current: AssignmentStatus,
  event: AssignmentEvent,
): AssignmentStatus {
  const next = TRANSITIONS[current][event];
  if (!next) {
    throw new AssignmentTransitionError(`Illegal assignment transition: ${event} from ${current}`);
  }
  return next;
}
