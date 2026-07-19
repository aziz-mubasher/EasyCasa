import { adjustCompToSubject } from './adjustments';
import type { Comparable, SubjectProperty } from './types';

const MAX_DIST_KM = 3;
const SIZE_TOLERANCE = 0.4; // ±40% of the subject's area
const MAX_MONTHS = 24;

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Keep comps of the same type, near enough, similar in size, and recent. */
export function selectComparables(subject: SubjectProperty, comps: readonly Comparable[]): Comparable[] {
  return comps.filter((c) => {
    if (c.type !== subject.type) return false;
    if (c.soldMonthsAgo > MAX_MONTHS) return false;
    if (subject.areaM2 <= 0) return false;
    if (Math.abs(c.areaM2 - subject.areaM2) / subject.areaM2 > SIZE_TOLERANCE) return false;
    return distanceKm(subject.lat, subject.lng, c.lat, c.lng) <= MAX_DIST_KM;
  });
}

/** Similarity weight: closer, more similar in size, and more recent counts more. */
export function weight(comp: Comparable, subject: SubjectProperty): number {
  const dist = distanceKm(subject.lat, subject.lng, comp.lat, comp.lng);
  const distW = 1 / (1 + dist);
  const sizeW = 1 - Math.min(Math.abs(comp.areaM2 - subject.areaM2) / subject.areaM2, 1) * 0.5;
  const recW = 1 / (1 + comp.soldMonthsAgo / 12);
  return distW * sizeW * recW;
}

export interface WeightedPpm2 {
  /** Weighted, feature-adjusted €/m² (cents). */
  ppm2Cents: number;
  /** Weighted coefficient of variation (dispersion) of the adjusted comps. */
  cv: number;
  count: number;
}

/** Weighted, feature-adjusted €/m² over the selected comps, with dispersion. */
export function weightedPricePerM2(subject: SubjectProperty, comps: readonly Comparable[]): WeightedPpm2 | null {
  if (comps.length === 0) return null;
  const items = comps.map((c) => ({ ppm2: adjustCompToSubject(c, subject), w: weight(c, subject) }));
  const totalW = items.reduce((s, i) => s + i.w, 0);
  if (totalW <= 0) return null;

  const mean = items.reduce((s, i) => s + i.w * i.ppm2, 0) / totalW;
  const variance = items.reduce((s, i) => s + i.w * (i.ppm2 - mean) ** 2, 0) / totalW;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  return { ppm2Cents: Math.round(mean), cv, count: comps.length };
}
