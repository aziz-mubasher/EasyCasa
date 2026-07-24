/** Escape a value embedded in a Meilisearch double-quoted string literal. */
export function escapeMeiliString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function meiliEqFilter(field: string, value: string): string {
  return `${field} = "${escapeMeiliString(value)}"`;
}

export function meiliNumericFilter(
  field: string,
  op: '>=' | '<=',
  value: number,
): string {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric filter value for ${field}`);
  }
  return `${field} ${op} ${value}`;
}

export interface TextSearchFilterParams {
  categorySlug?: string;
  city?: string;
  regionSlug?: string;
  provinceSlug?: string;
  transactionType?: string;
  assetClass?: string;
  propertyType?: string;
  condition?: string;
  financingOption?: string;
  leaseType?: string;
  sellerType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minSizeSqm?: number;
  maxSizeSqm?: number;
  energyClass?: string;
  /** Comma-separated feature slugs (AND). */
  features?: string;
}

/** Build Meilisearch filter clauses for GET /search. Assumes closed-set fields are pre-validated. */
export function buildTextSearchFilters(p: TextSearchFilterParams): string[] {
  const filters: string[] = [meiliEqFilter('status', 'published')];

  if (p.categorySlug) filters.push(meiliEqFilter('categorySlug', p.categorySlug));
  if (p.city) filters.push(meiliEqFilter('city', p.city));
  if (p.regionSlug) filters.push(meiliEqFilter('regionSlug', p.regionSlug));
  if (p.provinceSlug) filters.push(meiliEqFilter('provinceSlug', p.provinceSlug.toUpperCase()));
  // Match multi-deal listings and legacy single transactionType docs.
  if (p.transactionType) {
    const v = escapeMeiliString(p.transactionType);
    filters.push(`(transactionTypes = "${v}" OR transactionType = "${v}")`);
  }
  if (p.assetClass) filters.push(meiliEqFilter('assetClass', p.assetClass));
  if (p.propertyType) filters.push(meiliEqFilter('propertyType', p.propertyType));
  if (p.condition) filters.push(meiliEqFilter('condition', p.condition));
  if (p.financingOption) filters.push(meiliEqFilter('financingOptions', p.financingOption));
  if (p.leaseType) filters.push(meiliEqFilter('leaseType', p.leaseType));
  if (p.sellerType) filters.push(meiliEqFilter('sellerType', p.sellerType));
  if (p.minPrice != null) filters.push(meiliNumericFilter('price', '>=', p.minPrice));
  if (p.maxPrice != null) filters.push(meiliNumericFilter('price', '<=', p.maxPrice));
  if (p.minBedrooms != null) filters.push(meiliNumericFilter('bedrooms', '>=', p.minBedrooms));
  if (p.minBathrooms != null) filters.push(meiliNumericFilter('bathrooms', '>=', p.minBathrooms));
  if (p.minSizeSqm != null) filters.push(meiliNumericFilter('sizeSqm', '>=', p.minSizeSqm));
  if (p.maxSizeSqm != null) filters.push(meiliNumericFilter('sizeSqm', '<=', p.maxSizeSqm));
  if (p.energyClass) filters.push(meiliEqFilter('energyClass', p.energyClass.toUpperCase()));
  if (p.features) {
    for (const raw of p.features.split(',')) {
      const f = raw.trim();
      if (f) filters.push(meiliEqFilter('features', f));
    }
  }

  return filters;
}
