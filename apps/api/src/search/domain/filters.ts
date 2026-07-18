import type { ListingPin, SearchFilters } from './types';

/**
 * Whether a listing satisfies the filters. Pure — used to double-check index
 * results and to filter in tests.
 */
export function matchesFilters(listing: ListingPin, f: SearchFilters): boolean {
  if (f.dealType && listing.dealType !== f.dealType) return false;
  if (f.priceMinCents !== undefined && listing.priceCents < f.priceMinCents) return false;
  if (f.priceMaxCents !== undefined && listing.priceCents > f.priceMaxCents) return false;
  if (f.types && f.types.length > 0 && !f.types.includes(listing.type)) return false;
  if (f.minRooms !== undefined && listing.rooms < f.minRooms) return false;
  if (f.minAreaM2 !== undefined && listing.areaM2 < f.minAreaM2) return false;
  if (f.energyClasses && f.energyClasses.length > 0) {
    if (!listing.energyClass || !f.energyClasses.includes(listing.energyClass)) return false;
  }
  return true;
}

/**
 * Build Meilisearch-style filter clauses from domain filters.
 * Uses EasyCasa's existing listings index field names (`price` in euros,
 * `transactionType`, `propertyType`, `rooms`, `sizeSqm`, `energyClass`).
 */
export function buildIndexFilters(f: SearchFilters): string[] {
  const clauses: string[] = [];
  if (f.dealType) clauses.push(`transactionType = "${f.dealType}"`);
  if (f.priceMinCents !== undefined) {
    clauses.push(`price >= ${f.priceMinCents / 100}`);
  }
  if (f.priceMaxCents !== undefined) {
    clauses.push(`price <= ${f.priceMaxCents / 100}`);
  }
  if (f.minRooms !== undefined) clauses.push(`rooms >= ${f.minRooms}`);
  if (f.minAreaM2 !== undefined) clauses.push(`sizeSqm >= ${f.minAreaM2}`);
  if (f.types && f.types.length > 0) {
    clauses.push(`(${f.types.map((t) => `propertyType = "${t}"`).join(' OR ')})`);
  }
  if (f.energyClasses && f.energyClasses.length > 0) {
    clauses.push(`(${f.energyClasses.map((e) => `energyClass = "${e}"`).join(' OR ')})`);
  }
  return clauses;
}
