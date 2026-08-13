import { plainDescription } from './listing-detail';

const META_DESCRIPTION_MAX = 160;

export type ListingMetaInput = {
  title: string;
  description: string | null;
  city: string | null;
  /** Already-localized fallback when description is empty, e.g. "Property listing in Milan." */
  descriptionFallback: string;
};

/** Truncate at a word boundary when possible; keep ≤ maxLen. */
export function truncateMetaDescription(text: string, maxLen = META_DESCRIPTION_MAX): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  const slice = cleaned.slice(0, maxLen - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > 40 ? slice.slice(0, lastSpace) : slice;
  return `${base.replace(/[.,;:\s]+$/u, '')}…`;
}

export function buildListingMetaDescription(input: ListingMetaInput): string {
  const fromBody = input.description ? plainDescription(input.description) : '';
  if (fromBody) return truncateMetaDescription(fromBody);
  return truncateMetaDescription(input.descriptionFallback);
}

export function buildListingMetaTitle(title: string, brand = 'EasyCasa'): string {
  const t = title.trim() || brand;
  if (t.toLowerCase().includes(brand.toLowerCase())) return t;
  return `${t} | ${brand}`;
}
