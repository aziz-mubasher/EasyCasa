/**
 * Phase 17 client surface — payments (create intent, refund) and invoicing
 * (issue + fetch the fattura). Owner checkout uses the client secret with the
 * PSP SDK; the fattura elettronica follows on webhook success.
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';

export const PaymentStatusSchema = z.enum([
  'REQUIRES_PAYMENT',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED',
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const PaymentIntentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  purpose: z.enum(['DUE_NOW', 'PROVVIGIONE']),
  amountCents: z.number().int(),
  status: PaymentStatusSchema,
  providerRef: z.string().nullable(),
});
export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;

export const CreatedIntentSchema = z.object({
  intentId: z.string(),
  clientSecret: z.string(),
});
export type CreatedIntent = z.infer<typeof CreatedIntentSchema>;

const RiepilogoSchema = z.object({
  ivaRate: z.number(),
  imponibileCents: z.number().int(),
  impostaCents: z.number().int(),
  natura: z.string().optional(),
});

export const InvoiceSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  paymentIntentId: z.string().nullable().optional(),
  totaleDocumentoCents: z.number().int(),
  sdiProtocollo: z.string().nullable(),
  transmittedAt: z.string().nullable(),
  invoice: z.object({
    format: z.literal('FatturaPA 1.2.2'),
    documentType: z.literal('TD01'),
    operationDate: z.string(),
    emissionDeadline: z.string(),
    riepilogo: z.array(RiepilogoSchema),
    imponibileTotalCents: z.number().int(),
    impostaTotalCents: z.number().int(),
    bolloCents: z.number().int(),
    needsBollo: z.boolean(),
    totaleDocumentoCents: z.number().int(),
  }),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

/** Order payments + fattura (distinct from membership Stripe billing). */
export class EasyCasaPaymentsApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(private readonly opts: RequesterOptions) {
    this.request = createRequester(opts);
  }

  createIntent(body: {
    orderId: string;
    purpose: 'DUE_NOW' | 'PROVVIGIONE';
    amountCents: number;
  }): Promise<CreatedIntent> {
    return this.request('/payments/intents', CreatedIntentSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  getIntent(id: string): Promise<PaymentIntent> {
    return this.request(`/payments/intents/${encodeURIComponent(id)}`, PaymentIntentSchema);
  }

  refund(id: string): Promise<PaymentIntent> {
    return this.request(`/payments/intents/${encodeURIComponent(id)}/refund`, PaymentIntentSchema, {
      method: 'POST',
    });
  }

  issueInvoice(orderId: string): Promise<Invoice> {
    return this.request(`/invoices/orders/${encodeURIComponent(orderId)}`, InvoiceSchema, {
      method: 'POST',
    });
  }

  getInvoice(id: string): Promise<Invoice> {
    return this.request(`/invoices/${encodeURIComponent(id)}`, InvoiceSchema);
  }
}

/** @deprecated Prefer EasyCasaPaymentsApi — alias kept for scaffold naming. */
export const EasyCasaBillingApi = EasyCasaPaymentsApi;
