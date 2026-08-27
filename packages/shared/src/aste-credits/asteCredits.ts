/** Easy Legenda credit pack SKUs (flat fee, not subscription). */

export const ASTE_CREDIT_PACKS = [1, 5, 20] as const;
export type AsteCreditPackSize = (typeof ASTE_CREDIT_PACKS)[number];

export function isAsteCreditPackSize(n: number): n is AsteCreditPackSize {
  return (ASTE_CREDIT_PACKS as readonly number[]).includes(n);
}

/**
 * Live catalogue prices in euro cents (IVA included).
 * Production Stripe Price IDs override these when set in env.
 */
export function asteCreditPackFallbackCents(pack: AsteCreditPackSize): number {
  switch (pack) {
    case 1:
      return 2900;
    case 5:
      return 9900;
    case 20:
      return 29900;
    default:
      return 2900;
  }
}

export function asteCreditPackProductName(pack: AsteCreditPackSize): string {
  return `Easy Legenda — ${pack} credit${pack === 1 ? '' : 's'}`;
}
