/**
 * Pricing page — journey mapping and comparison constants (not catalog prices).
 * Catalog amounts always come from GET /service-catalog.
 */

/** Illustrative market reference for traditional full-service agencies (not a competitor claim). */
export const TRADITIONAL_AGENCY_RATE = 0.03;

export const DEFAULT_PROPERTY_VALUE_EUR = 200_000;

/** Seller-side à la carte items shown in the savings comparison (mediation rate from catalog). */
export const COMPARISON_SELLER_ITEM_CODES = [
  'VALUATION',
  'APE_ISSUANCE',
  'MEDIA_PACK',
  'FULL_MEDIATION',
] as const;

export type PricingJourney = 'sell' | 'buy' | 'rent';

/** Which catalog item codes appear under each visitor intent (items may repeat across journeys). */
export const JOURNEY_ITEM_CODES: Record<PricingJourney, readonly string[]> = {
  sell: [
    'LISTING_PUBLICATION',
    'VALUATION',
    'DOC_CHECKUP',
    'CATASTO_RETRIEVAL',
    'CONFORMITY_SURVEY',
    'APE_ISSUANCE',
    'MEDIA_PACK',
    'VIRTUAL_TOUR',
    'FULL_MEDIATION',
    'ROGITO_COORDINATION',
  ],
  buy: [
    'VIEWING_ACCOMPANIMENT',
    'BUYER_MEDIATION',
    'OFFER_DRAFTING',
    'DOC_CHECKUP',
    'VALUATION',
  ],
  rent: [
    'LISTING_PUBLICATION',
    'LEASE_DRAFTING',
    'RLI_REGISTRATION',
    'REGISTRATION_TAXES',
    'TENANT_SCREENING',
  ],
};

/** Package codes surfaced on the pricing page (order = display priority). */
export const FEATURED_PACKAGE_CODES = [
  'FAI_DA_TE',
  'ASSISTITO',
  'CHIAVI_IN_MANO',
  'AFFITTO_SERENO',
] as const;

export const IVA_RATE = 0.22;
