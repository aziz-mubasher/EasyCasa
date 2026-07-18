/**
 * The action a professional can take next on an assignment, derived purely from
 * status. Shared between the backend (authorization) and the app UI so both
 * agree on what's allowed.
 */
import type { AssignmentStatus } from './types';

export type ProAction = 'start' | 'deliver' | 'none';

export function nextProAction(status: AssignmentStatus): ProAction {
  if (status === 'ASSIGNED') return 'start';
  if (status === 'IN_PROGRESS') return 'deliver';
  return 'none';
}
