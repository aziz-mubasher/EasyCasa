import { selectComparables, weightedPricePerM2 } from './comparables';
import type { Comparable, Confidence, OmiBand, SubjectProperty, ValuationEstimate } from './types';

export class InsufficientDataError extends Error {}

const MIN_COMPS = 3;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(v, hi));
}

/** Pull an estimate partway into the OMI band when it falls outside it. */
function blendWithOmi(ppm2: number, omi: OmiBand): number {
  if (ppm2 < omi.minPerM2Cents) return Math.round(ppm2 + (omi.minPerM2Cents - ppm2) * 0.5);
  if (ppm2 > omi.maxPerM2Cents) return Math.round(ppm2 - (ppm2 - omi.maxPerM2Cents) * 0.5);
  return ppm2;
}

function confidenceOf(count: number, cv: number): Confidence {
  if (count >= 8 && cv < 0.15) return 'high';
  if (count >= MIN_COMPS) return 'medium';
  return 'low';
}

/**
 * Produce a valuation range. Prefers comparables (feature-adjusted, weighted);
 * blends toward the OMI band when available; falls back to the OMI band alone
 * when comps are too sparse. Throws when there's neither.
 */
export function computeEstimate(
  subject: SubjectProperty,
  comps: readonly Comparable[],
  omi?: OmiBand,
): ValuationEstimate {
  const selected = selectComparables(subject, comps);
  const weighted = selected.length >= MIN_COMPS ? weightedPricePerM2(subject, selected) : null;

  if (weighted) {
    let ppm2 = weighted.ppm2Cents;
    let basis: ValuationEstimate['basis'] = 'comparables';
    if (omi) {
      ppm2 = blendWithOmi(ppm2, omi);
      basis = 'blended';
    }
    const point = Math.round(ppm2 * subject.areaM2);
    const rangePct = clamp(0.06 + weighted.cv * 0.6, 0.06, 0.22);
    return {
      pointCents: point,
      minCents: Math.round(point * (1 - rangePct)),
      maxCents: Math.round(point * (1 + rangePct)),
      pricePerM2Cents: ppm2,
      confidence: confidenceOf(weighted.count, weighted.cv),
      basis,
      comparablesUsed: weighted.count,
    };
  }

  if (omi) {
    const mid = Math.round((omi.minPerM2Cents + omi.maxPerM2Cents) / 2);
    return {
      pointCents: Math.round(mid * subject.areaM2),
      minCents: Math.round(omi.minPerM2Cents * subject.areaM2),
      maxCents: Math.round(omi.maxPerM2Cents * subject.areaM2),
      pricePerM2Cents: mid,
      confidence: 'low',
      basis: 'omi',
      comparablesUsed: 0,
    };
  }

  throw new InsufficientDataError('Not enough comparables and no OMI band for this area');
}
