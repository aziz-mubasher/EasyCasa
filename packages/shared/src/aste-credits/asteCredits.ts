/** EC-27 — Aste full-report credit pack SKUs (flat fee, not subscription). */

import { ASTE_PRODUCT_NAME } from '../aste-product/asteProductName';

export const ASTE_CREDIT_PACKS = [1, 3, 10] as const;
export type AsteCreditPackSize = (typeof ASTE_CREDIT_PACKS)[number];

export function isAsteCreditPackSize(n: number): n is AsteCreditPackSize {
  return (ASTE_CREDIT_PACKS as readonly number[]).includes(n);
}

/**
 * Test-mode price_data fallback only — production uses Stripe Price IDs from env.
 * AZM sets final prices in Stripe dashboard; these placeholders match the design brief.
 */
export function asteCreditPackFallbackCents(pack: AsteCreditPackSize): number {
  switch (pack) {
    case 1:
      return 990;
    case 3:
      return 2490;
    case 10:
      return 6990;
    default:
      return 990;
  }
}

/** Stripe Checkout product_data.name — reads display name from SSOT (IT canonical). */
export function asteCreditPackProductName(pack: AsteCreditPackSize): string {
  return `${ASTE_PRODUCT_NAME.it} — ${pack} credit${pack === 1 ? '' : 's'}`;
}
