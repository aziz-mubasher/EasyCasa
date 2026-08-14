import { buildFaqPage, buildService } from '@easycasa/shared';

export type SellPrivatelyFaqItem = { q: string; a: string };

/** @deprecated Import `buildService` from `@easycasa/shared` — kept for re-export stability. */
export const buildSellPrivatelyServiceLd = buildService;

export function buildSellPrivatelyFaqLd(faq: readonly SellPrivatelyFaqItem[]): Record<string, unknown> {
  return buildFaqPage(faq.map((item) => ({ question: item.q, answer: item.a })));
}
