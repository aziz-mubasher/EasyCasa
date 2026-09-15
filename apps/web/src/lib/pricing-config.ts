/**
 * Pricing page — journey mapping (not catalog prices).
 * Catalog amounts always come from GET /service-catalog.
 */

export const DEFAULT_PROPERTY_VALUE_EUR = 200_000;

export type PricingJourney = 'sell' | 'buy' | 'rent';

/** Featured à la carte rows. Inactive / reserved SKUs are omitted. */
export const JOURNEY_ITEM_CODES: Record<PricingJourney, readonly string[]> = {
  sell: [
    'LISTING_PUBLICATION',
    'VALUATION',
    'DOC_CHECKUP',
    'CONFORMITY_SURVEY',
    'MEDIA_PACK',
    'VIRTUAL_TOUR',
    'VIEWING_KIT',
    'SELL_IT_YOURSELF_COURSE',
  ],
  buy: ['DOC_CHECKUP', 'VALUATION', 'PROPOSAL_NOTE'],
  rent: ['LISTING_PUBLICATION', 'LEASE_DRAFTING', 'RLI_REGISTRATION'],
};

export const FEATURED_PACKAGE_CODES = [
  'READY_TO_LIST',
  'READY_TO_SELL',
  'RENTING_MADE_SIMPLE',
] as const;

export const IVA_RATE = 0.22;
