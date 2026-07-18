import type { QualityScore, RawListing } from './types';

interface QualityCriterion {
  key: string;
  weight: number;
  satisfied: (l: RawListing) => boolean;
}

/**
 * Presence-based listing quality (0–100), like idealista's quality score.
 * Weights sum to 100.
 */
const CRITERIA: QualityCriterion[] = [
  { key: 'photos', weight: 25, satisfied: (l) => l.photos.length >= 6 },
  { key: 'floorPlan', weight: 15, satisfied: (l) => l.hasFloorPlan },
  { key: 'energyClass', weight: 15, satisfied: (l) => l.energyClass !== null },
  {
    key: 'description',
    weight: 15,
    satisfied: (l) => (l.description?.trim().length ?? 0) >= 200,
  },
  {
    key: 'catastal',
    weight: 15,
    satisfied: (l) => l.foglio !== null && l.particella !== null,
  },
  {
    key: 'keyFacts',
    weight: 15,
    satisfied: (l) => l.bathrooms !== null && l.floor !== null && l.yearBuilt !== null,
  },
];

export function scoreListingQuality(listing: RawListing): QualityScore {
  let score = 0;
  const missing: string[] = [];
  for (const c of CRITERIA) {
    if (c.satisfied(listing)) score += c.weight;
    else missing.push(c.key);
  }
  return { score, missing };
}
