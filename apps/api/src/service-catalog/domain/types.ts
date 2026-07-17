/**
 * Service-catalog domain — pure types.
 *
 * EasyCasa unbundles agency work into individually orderable items. Three
 * revenue kinds coexist on one order:
 *   - fixed:       a set EasyCasa service fee (subject to IVA 22%)
 *   - provvigione: a % that matures on "conclusione dell'affare" (IVA 22%)
 *   - passthrough: taxes / third-party costs reimbursed at cost (no EasyCasa IVA)
 * All money is in integer euro cents to avoid floating-point drift.
 */

export type PriceModel = 'fixed' | 'provvigione' | 'passthrough';

export type ServiceCategory =
  | 'listing'
  | 'valuation'
  | 'documents'
  | 'media'
  | 'mediation'
  | 'closing'
  | 'rental'
  | 'aml';

/** Italian standard VAT on agency services. */
export const IVA_RATE = 0.22;

export interface CatalogItem {
  code: string;
  labelEn: string;
  labelIt: string;
  category: ServiceCategory;
  priceModel: PriceModel;
  /** For 'fixed' and 'passthrough': amount in cents. */
  amountCents?: number;
  /** For 'provvigione': rate as a fraction, e.g. 0.0249. */
  ratePercent?: number;
  /** Whether EasyCasa adds IVA. True for services; false for pass-through taxes. */
  ivaApplicable: boolean;
}

export interface ServicePackage {
  code: string;
  labelEn: string;
  labelIt: string;
  /** Catalog item codes included in the bundle. */
  includes: string[];
  /**
   * If set, the fixed-price items in `includes` are covered by this single
   * bundle price (cents). provvigione and passthrough items still apply.
   */
  bundleFixedCents?: number;
}

export interface QuoteRequest {
  /** À la carte item codes. */
  items?: string[];
  /** Optional package code; its items are merged with `items`. */
  packageCode?: string;
  /**
   * Reference value (cents) used only to *estimate* provvigione amounts.
   * The actual provvigione matures later, on conclusione dell'affare.
   */
  referenceValueCents?: number;
}

export type QuoteLineKind = PriceModel | 'bundle';

export interface QuoteLine {
  code: string;
  labelEn: string;
  labelIt: string;
  kind: QuoteLineKind;
  netCents: number;
  ivaCents: number;
  grossCents: number;
  /** True when the amount is an estimate (provvigione before conclusion). */
  estimated: boolean;
  note?: string;
}

export interface Quote {
  lines: QuoteLine[];
  fixedNetCents: number;
  provvigioneEstimatedNetCents: number;
  passthroughCents: number;
  ivaCents: number;
  /** Total the client can expect now (fixed + passthrough + their IVA). */
  dueNowGrossCents: number;
  /** Estimated grand total including estimated provvigione. */
  estimatedTotalGrossCents: number;
  currency: 'EUR';
}
