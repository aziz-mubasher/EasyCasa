/**
 * Phase 10 client surface — orders + mandate (the transactional seam).
 * Consumed by the owner portal "accept quote → mandate → sign" flow.
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export const OrderLineSchema = z.object({
  itemCode: z.string(),
  kind: z.string(),
  netCents: z.number().int(),
  ivaCents: z.number().int(),
  grossCents: z.number().int(),
  estimated: z.boolean(),
});
export type OrderLine = z.infer<typeof OrderLineSchema>;

export const OrderStatusSchema = z.enum([
  'QUOTED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  packageCode: z.string().nullable(),
  status: OrderStatusSchema,
  itemCodes: z.array(z.string()),
  lines: z.array(OrderLineSchema),
  dueNowGrossCents: z.number().int(),
  estimatedTotalGrossCents: z.number().int(),
});
export type Order = z.infer<typeof OrderSchema>;

export interface CreateOrderRequest {
  items?: string[];
  packageCode?: string;
  referenceValueCents?: number;
}

/* ------------------------------------------------------------------ */
/* Mandate                                                             */
/* ------------------------------------------------------------------ */

export const MandateStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'SIGNED',
  'WITHDRAWN',
  'EXPIRED',
]);
export type MandateStatus = z.infer<typeof MandateStatusSchema>;

export const MandateTypeSchema = z.enum(['MEDIAZIONE', 'MANDATO_ONEROSO']);
export type MandateType = z.infer<typeof MandateTypeSchema>;

export const MandateSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  propertyId: z.string(),
  types: z.array(MandateTypeSchema),
  reviewRequiredItems: z.array(z.string()),
  status: MandateStatusSchema,
  exclusive: z.boolean(),
  durationMonths: z.number().int(),
  signatureEnvelopeId: z.string().nullable(),
  signingUrl: z.string().nullable(),
  signedAt: z.string().nullable(),
});
export type Mandate = z.infer<typeof MandateSchema>;

export const SigningUrlSchema = z.object({ signingUrl: z.string() });
export type SigningUrl = z.infer<typeof SigningUrlSchema>;

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

export class EasyCasaTransactionsApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(private readonly opts: RequesterOptions) {
    this.request = createRequester(opts);
  }

  createOrder(propertyId: string, body: CreateOrderRequest): Promise<Order> {
    return this.request(
      `/properties/${encodeURIComponent(propertyId)}/orders`,
      OrderSchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  getOrder(id: string): Promise<Order> {
    return this.request(`/orders/${encodeURIComponent(id)}`, OrderSchema);
  }

  createMandate(body: {
    orderId: string;
    exclusive: boolean;
    durationMonths: number;
  }): Promise<Mandate> {
    return this.request('/mandates', MandateSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  getMandate(id: string): Promise<Mandate> {
    return this.request(`/mandates/${encodeURIComponent(id)}`, MandateSchema);
  }

  requestSignature(
    id: string,
    body: { signerEmail: string; documentUrl: string },
  ): Promise<SigningUrl> {
    return this.request(
      `/mandates/${encodeURIComponent(id)}/signature-request`,
      SigningUrlSchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }
}
