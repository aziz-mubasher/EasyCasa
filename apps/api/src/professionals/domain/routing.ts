import { canAssign } from './eligibility';
import type { Professional, TaskContext } from './types';

export interface Candidate {
  professional: Professional;
  load: number;
}

/**
 * Rank the professionals eligible for a task. Only those that clear the full
 * eligibility gate are returned, sorted by current load ascending so work
 * spreads evenly (a simple, explainable routing policy).
 */
export function selectCandidates(
  task: TaskContext,
  professionals: readonly Professional[],
  now: Date = new Date(),
): Candidate[] {
  return professionals
    .filter((p) => canAssign(p, task, now).allowed)
    .map((p) => ({ professional: p, load: p.activeAssignments }))
    .sort((a, b) => a.load - b.load);
}

/** Convenience: the single best candidate, or null if none are eligible. */
export function bestCandidate(
  task: TaskContext,
  professionals: readonly Professional[],
  now: Date = new Date(),
): Professional | null {
  return selectCandidates(task, professionals, now)[0]?.professional ?? null;
}
