import type { LegalBasis, MandateDerivation, MandateType, QuoteRequest } from './types';

/**
 * Expand a quote request to the flat set of underlying catalog item codes,
 * merging a package's contents (via the injected map) with à la carte items.
 * Injected rather than imported so this stays dependency-free and testable.
 */
export function resolveOrderItemCodes(
  req: QuoteRequest,
  packageContents: Readonly<Record<string, readonly string[]>>,
): string[] {
  const set = new Set<string>();
  if (req.packageCode) {
    for (const code of packageContents[req.packageCode] ?? []) set.add(code);
  }
  for (const code of req.items ?? []) set.add(code);
  return [...set];
}

/**
 * Derive the mandate from an order's item codes and their configured legal
 * basis. Any item that is REVIEW_REQUIRED (or missing from the map) lands in
 * `reviewRequiredItems` and blocks the mandate from being sent — this is the
 * guardrail that keeps an unreviewed legal classification from ever going live.
 */
export function deriveMandate(
  itemCodes: readonly string[],
  legalBasis: Readonly<Record<string, LegalBasis>>,
): MandateDerivation {
  const types = new Set<MandateType>();
  const reviewRequiredItems: string[] = [];

  for (const code of itemCodes) {
    const basis = legalBasis[code] ?? 'REVIEW_REQUIRED';
    if (basis === 'REVIEW_REQUIRED') reviewRequiredItems.push(code);
    else types.add(basis);
  }

  const typesArr = [...types];
  return {
    types: typesArr,
    reviewRequiredItems,
    canProceed: reviewRequiredItems.length === 0 && typesArr.length >= 1,
  };
}
