/**
 * EasyCasa multi-axis property taxonomy (docs/taxonomy.md).
 * Independent axes replace the legacy single Tipologia category list.
 */

export const TRANSACTION_TYPE_SLUGS = [
  'sale',
  'rent',
  'auction',
  'bare_ownership',
] as const;
export type TransactionTypeSlug = (typeof TRANSACTION_TYPE_SLUGS)[number];

export const ASSET_CLASS_SLUGS = [
  'residential',
  'commercial',
  'office',
  'industrial',
  'land',
  'garage',
  'hospitality',
] as const;
export type AssetClassSlug = (typeof ASSET_CLASS_SLUGS)[number];

export const PROPERTY_TYPE_SLUGS = [
  'apartment',
  'studio',
  'penthouse',
  'loft',
  'attic',
  'villa',
  'townhouse',
  'detached',
  'rustic',
  'farmhouse',
  'building',
  'room',
] as const;
export type PropertyTypeSlug = (typeof PROPERTY_TYPE_SLUGS)[number];

export const CONDITION_SLUGS = [
  'new_build',
  'under_construction',
  'renovated',
  'good',
  'to_renovate',
  'shell',
] as const;
export type ConditionSlug = (typeof CONDITION_SLUGS)[number];

/** NIB — seller will transact without a traditional bank mortgage. Multi-select. */
export const FINANCING_OPTION_SLUGS = [
  'rent_to_buy',
  'seller_financing',
  'retention_of_title',
  'crowdfunding',
  'leasing',
  'barter',
  'life_annuity',
  'cash_only',
] as const;
export type FinancingOptionSlug = (typeof FINANCING_OPTION_SLUGS)[number];

export const LEASE_TYPE_SLUGS = [
  'free_4_4',
  'agreed_3_2',
  'transitional',
  'student',
  'short_stay',
  'commercial_6_6',
] as const;
export type LeaseTypeSlug = (typeof LEASE_TYPE_SLUGS)[number];

export const SELLER_TYPE_SLUGS = ['private', 'agency'] as const;
export type SellerTypeSlug = (typeof SELLER_TYPE_SLUGS)[number];

/** Legacy Tipologia slugs still accepted on search URLs / Meili categorySlug. */
export const LEGACY_CATEGORY_SLUGS = [
  'residential',
  'renovatable',
  'new-build',
  'commercial',
  'auction',
  'rooms',
] as const;
export type LegacyCategorySlug = (typeof LEGACY_CATEGORY_SLUGS)[number];

export interface ListingTaxonomyAxes {
  transactionType?: TransactionTypeSlug | null;
  assetClass?: AssetClassSlug | null;
  propertyType?: PropertyTypeSlug | null;
  condition?: ConditionSlug | null;
  financingOptions?: FinancingOptionSlug[] | null;
  leaseType?: LeaseTypeSlug | null;
  sellerType?: SellerTypeSlug | null;
}

/**
 * Derive legacy categorySlug for backward-compatible search URLs / facets.
 * Priority mirrors docs/taxonomy.md migration notes.
 */
export function deriveLegacyCategorySlug(axes: ListingTaxonomyAxes): LegacyCategorySlug | null {
  if (axes.transactionType === 'auction') return 'auction';
  if (axes.propertyType === 'room') return 'rooms';
  if (axes.financingOptions && axes.financingOptions.length > 0) return 'new-build';
  if (axes.condition === 'to_renovate' || axes.condition === 'shell') return 'renovatable';
  if (
    axes.assetClass === 'commercial' ||
    axes.assetClass === 'office' ||
    axes.assetClass === 'industrial' ||
    axes.assetClass === 'hospitality'
  ) {
    return 'commercial';
  }
  if (axes.assetClass === 'residential' || axes.assetClass === 'garage' || axes.assetClass === 'land') {
    return 'residential';
  }
  return null;
}

/** Map a legacy category key/slug onto the new axes (best-effort, no guessing beyond the table). */
export function mapLegacyCategoryToAxes(
  categoryKeyOrSlug: string | null | undefined,
): ListingTaxonomyAxes {
  const raw = (categoryKeyOrSlug ?? '').trim().toLowerCase();
  switch (raw) {
    case 'residential':
      return { assetClass: 'residential' };
    case 'renovatable':
      return { assetClass: 'residential', condition: 'to_renovate' };
    case 'nib':
    case 'new-build':
    case 'new_build':
      return { assetClass: 'residential', financingOptions: ['rent_to_buy'] };
    case 'commercial':
      return { assetClass: 'commercial' };
    case 'auction':
      return { transactionType: 'auction', assetClass: 'residential' };
    case 'rooms':
    case 'room':
      return { assetClass: 'residential', propertyType: 'room' };
    default:
      return {};
  }
}

export function isTransactionTypeSlug(v: string): v is TransactionTypeSlug {
  return (TRANSACTION_TYPE_SLUGS as readonly string[]).includes(v);
}
export function isAssetClassSlug(v: string): v is AssetClassSlug {
  return (ASSET_CLASS_SLUGS as readonly string[]).includes(v);
}
export function isPropertyTypeSlug(v: string): v is PropertyTypeSlug {
  return (PROPERTY_TYPE_SLUGS as readonly string[]).includes(v);
}
export function isConditionSlug(v: string): v is ConditionSlug {
  return (CONDITION_SLUGS as readonly string[]).includes(v);
}
export function isFinancingOptionSlug(v: string): v is FinancingOptionSlug {
  return (FINANCING_OPTION_SLUGS as readonly string[]).includes(v);
}
export function isLeaseTypeSlug(v: string): v is LeaseTypeSlug {
  return (LEASE_TYPE_SLUGS as readonly string[]).includes(v);
}
export function isSellerTypeSlug(v: string): v is SellerTypeSlug {
  return (SELLER_TYPE_SLUGS as readonly string[]).includes(v);
}
