/**
 * Pure presentation helpers for money. Deterministic (no Intl/ICU dependency)
 * so the same string renders identically on every platform and in tests.
 */
import type { Quote } from './phase8';

/** Format integer euro cents as an Italian-style amount, e.g. 123456 → "€ 1.234,56". */
export function formatEuroCents(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const euros = Math.floor(abs / 100);
  const rem = abs % 100;
  const eurosStr = euros
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // thousands separator '.'
  const centsStr = rem.toString().padStart(2, '0');
  return `${negative ? '-' : ''}€ ${eurosStr},${centsStr}`;
}

export interface QuoteDisplayLine {
  code: string;
  label: string;
  amount: string;
  estimated: boolean;
  note?: string;
}

export interface QuoteDisplay {
  lines: QuoteDisplayLine[];
  dueNow: string;
  estimatedTotal: string;
  hasEstimated: boolean;
}

/**
 * Turn a Quote into display rows, picking the label by locale. Keeps all the
 * "what shows now vs what's estimated" logic in one tested place.
 */
export function summarizeQuote(quote: Quote, locale: string): QuoteDisplay {
  const it = locale.startsWith('it');
  const lines: QuoteDisplayLine[] = quote.lines.map((l) => ({
    code: l.code,
    label: it ? l.labelIt : l.labelEn,
    amount: formatEuroCents(l.grossCents),
    estimated: l.estimated,
    ...(l.note ? { note: l.note } : {}),
  }));

  return {
    lines,
    dueNow: formatEuroCents(quote.dueNowGrossCents),
    estimatedTotal: formatEuroCents(quote.estimatedTotalGrossCents),
    hasEstimated: quote.lines.some((l) => l.estimated),
  };
}
