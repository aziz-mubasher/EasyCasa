import { matchesFilters } from '../../search/domain/filters';
import { inBBox, pointInPolygon } from '../../search/domain/geo';
import type { ListingPin, SavedSearchCriteria } from './types';

/**
 * Whether a listing satisfies a saved search. Reuses Phase 20 predicates so a
 * saved search and a live search can never disagree about what matches.
 */
export function listingMatchesSavedSearch(
  listing: ListingPin,
  c: SavedSearchCriteria,
): boolean {
  if (!matchesFilters(listing, c.filters ?? {})) return false;
  if (c.polygon && c.polygon.length >= 3) return pointInPolygon(listing, c.polygon);
  if (c.bbox) return inBBox(listing, c.bbox);
  return true;
}

/** Filter a batch of listings to those matching the criteria. */
export function matchingListings(
  listings: readonly ListingPin[],
  c: SavedSearchCriteria,
): ListingPin[] {
  return listings.filter((l) => listingMatchesSavedSearch(l, c));
}
