import type { QuoteRequestBody } from '@/lib/api';
import { apiUrl } from '@/auth/authedFetch';

export interface CreatedPaymentIntent {
  intentId: string;
  clientSecret: string;
}

export interface OrderSummary {
  id: string;
  status: string;
  dueNowGrossCents: number;
  estimatedTotalGrossCents: number;
}

export interface FatturaPreview {
  totaleDocumentoCents: number;
  imponibileTotalCents: number;
  impostaTotalCents: number;
}

export async function createCatalogCheckoutOrder(
  authedFetch: typeof fetch,
  body: QuoteRequestBody,
): Promise<OrderSummary> {
  const res = await authedFetch(apiUrl('/service-catalog/checkout-orders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message ?? `checkout order failed: ${res.status}`);
  }
  return res.json() as Promise<OrderSummary>;
}

export async function previewInvoice(
  authedFetch: typeof fetch,
  orderId: string,
): Promise<FatturaPreview> {
  const res = await authedFetch(apiUrl(`/invoices/orders/${encodeURIComponent(orderId)}/preview`));
  if (!res.ok) throw new Error(`invoice preview failed: ${res.status}`);
  return res.json() as Promise<FatturaPreview>;
}

export async function createPaymentIntent(
  authedFetch: typeof fetch,
  input: { orderId: string; amountCents: number },
): Promise<CreatedPaymentIntent> {
  const res = await authedFetch(apiUrl('/payments/intents'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: input.orderId, purpose: 'DUE_NOW', amountCents: input.amountCents }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message ?? `payment intent failed: ${res.status}`);
  }
  return res.json() as Promise<CreatedPaymentIntent>;
}

export async function getOrder(orderId: string): Promise<OrderSummary> {
  const base =
    (typeof window === 'undefined' ? process.env.API_URL : process.env.NEXT_PUBLIC_API_URL) ??
    'http://localhost/api';
  const res = await fetch(`${base}/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`order failed: ${res.status}`);
  return res.json() as Promise<OrderSummary>;
}

export async function getPaymentIntent(
  authedFetch: typeof fetch,
  intentId: string,
): Promise<{ status: string }> {
  const res = await authedFetch(apiUrl(`/payments/intents/${encodeURIComponent(intentId)}`));
  if (!res.ok) throw new Error(`intent failed: ${res.status}`);
  const data = (await res.json()) as { status: string };
  return data;
}

/** Card-payable gross (fixed + bundle); excludes provvigione and passthrough. */
export function cardPayableFromQuoteLines(
  lines: ReadonlyArray<{ kind: string; grossCents: number }>,
): number {
  return lines
    .filter((l) => l.kind !== 'provvigione' && l.kind !== 'passthrough')
    .reduce((s, l) => s + l.grossCents, 0);
}
