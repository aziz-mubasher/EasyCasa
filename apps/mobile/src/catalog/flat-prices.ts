import type { CatalogItem, Quote, QuoteLine } from '@easycasa/api-client';

/** Price models the app may render. Anything else is a sale-linked fee and is dropped. */
const FLAT_PRICE_MODELS = new Set<CatalogItem['priceModel']>(['fixed', 'passthrough']);

const FLAT_LINE_KINDS = new Set<QuoteLine['kind']>(['fixed', 'passthrough', 'bundle']);

let loggedCatalogDrop = false;
let loggedQuoteDrop = false;

function logOnce(kind: 'item' | 'line', code: string, already: boolean): boolean {
  if (already) return true;
  console.warn(`[catalog] dropped non-flat ${kind} ${code}`);
  return true;
}

export function isFlatCatalogItem(item: Pick<CatalogItem, 'priceModel'>): boolean {
  return FLAT_PRICE_MODELS.has(item.priceModel);
}

/** Drop catalogue rows the app must not show. Logs the first drop once per session. */
export function dropNonFlatCatalogItems<T extends Pick<CatalogItem, 'code' | 'priceModel'>>(
  items: readonly T[],
): T[] {
  const kept: T[] = [];
  for (const item of items) {
    if (isFlatCatalogItem(item)) {
      kept.push(item);
      continue;
    }
    loggedCatalogDrop = logOnce('item', item.code, loggedCatalogDrop);
  }
  return kept;
}

/**
 * Remove non-flat lines before display and recompute the totals from what remains,
 * so a hidden line cannot survive inside the headline amount.
 */
export function omitNonFlatQuote(quote: Quote): Quote {
  const lines = quote.lines.filter((line) => {
    if (FLAT_LINE_KINDS.has(line.kind)) return true;
    loggedQuoteDrop = logOnce('line', line.code, loggedQuoteDrop);
    return false;
  });
  if (lines.length === quote.lines.length) return quote;

  const dueNowGrossCents = lines
    .filter((line) => !line.estimated)
    .reduce((sum, line) => sum + line.grossCents, 0);
  const estimatedGrossCents = lines
    .filter((line) => line.estimated)
    .reduce((sum, line) => sum + line.grossCents, 0);

  return {
    ...quote,
    lines,
    dueNowGrossCents,
    estimatedTotalGrossCents: dueNowGrossCents + estimatedGrossCents,
  };
}
