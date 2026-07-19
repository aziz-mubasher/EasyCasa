import type { Comparable, Condition, EnergyClass, SubjectProperty } from './types';

/** Energy class → value rank (C is the neutral reference). */
const ENERGY_RANK: Record<EnergyClass, number> = {
  A4: 9, A3: 8, A2: 7, A1: 6, B: 5, C: 4, D: 3, E: 2, F: 1, G: 0,
};

/** Each energy-class step is worth ~1.5% on €/m². */
function energyFactor(c: EnergyClass): number {
  return 1 + (ENERGY_RANK[c] - ENERGY_RANK.C) * 0.015;
}

const CONDITION_FACTOR: Record<Condition, number> = {
  new: 1.12,
  renovated: 1.06,
  good: 1.0,
  to_renovate: 0.85,
};

function floorFactor(floor: number): number {
  if (floor <= 0) return 0.98; // ground / basement
  if (floor >= 4) return 1.02; // higher floors / views
  return 1.0;
}

/** Ratio that maps a comp feature to the subject's, or 1 when either is unknown. */
function ratio<T>(subjectVal: T | null, compVal: T | null, fn: (v: T) => number): number {
  if (subjectVal === null || compVal === null) return 1;
  return fn(subjectVal) / fn(compVal);
}

/**
 * Adjust a comparable's €/m² to what it would be with the subject's features
 * (energy class, condition, floor), so like is compared with like.
 */
export function adjustCompToSubject(comp: Comparable, subject: SubjectProperty): number {
  const ef = ratio(subject.energyClass, comp.energyClass, energyFactor);
  const cf = ratio(subject.condition, comp.condition, (c) => CONDITION_FACTOR[c]);
  const ff = ratio(subject.floor, comp.floor, floorFactor);
  return Math.round(comp.pricePerM2Cents * ef * cf * ff);
}
