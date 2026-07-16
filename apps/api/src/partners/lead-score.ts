export interface LeadSignals {
  messageLength: number;
  hasContactIntent: boolean; // asked to view / call / buy
  buyerHasHistory: boolean;  // returning / has favorites
  priceKnown: boolean;
}

/** Transparent 0–100 lead score. Higher = more sales-ready. */
export function scoreLead(s: LeadSignals): number {
  let score = 10;
  if (s.messageLength >= 40) score += 25;
  else if (s.messageLength >= 15) score += 12;
  if (s.hasContactIntent) score += 30;
  if (s.buyerHasHistory) score += 20;
  if (s.priceKnown) score += 15;
  return Math.max(0, Math.min(100, score));
}

const INTENT = ['visit', 'viewing', 'call', 'buy', 'mortgage', 'visita', 'chiamare', 'comprare', 'mutuo', 'comprar', 'llamar'];
export function hasContactIntent(body: string): boolean {
  const t = body.toLowerCase();
  return INTENT.some((k) => t.includes(k));
}
