import type { AlertFrequency, Digest, ListingPin, SavedSearch } from './types';

/**
 * Which matched listings to notify about: nothing when alerts are off, and
 * never the same listing twice for one saved search.
 */
export function selectToNotify(
  frequency: AlertFrequency,
  alreadyNotifiedIds: readonly string[],
  matchedIds: readonly string[],
): string[] {
  if (frequency === 'off') return [];
  const seen = new Set(alreadyNotifiedIds);
  const out: string[] = [];
  for (const id of matchedIds) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

const DIGEST_CAP = 20;

/** Build a capped digest for a saved search from its new matching listings. */
export function buildDigest(
  savedSearch: Pick<SavedSearch, 'id' | 'name'>,
  matches: readonly ListingPin[],
  cap: number = DIGEST_CAP,
): Digest {
  return {
    savedSearchId: savedSearch.id,
    savedSearchName: savedSearch.name,
    items: matches.slice(0, cap).map((m) => ({
      listingId: m.listingId,
      title: m.title,
      priceCents: m.priceCents,
    })),
    total: matches.length,
  };
}
