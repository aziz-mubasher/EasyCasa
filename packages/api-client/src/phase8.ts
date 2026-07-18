/**
 * Owner-side API surface — the Phase 8 endpoints (service catalog + fascicolo),
 * consumed by the Phase 9 owner portal. Schemas mirror the API's domain types
 * so a shape change on the server fails loudly here.
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';
import { OrderSchema, type Order } from './phase10';

/* ------------------------------------------------------------------ */
/* Service catalog                                                     */
/* ------------------------------------------------------------------ */

export const PriceModelSchema = z.enum(['fixed', 'provvigione', 'passthrough']);
export type PriceModel = z.infer<typeof PriceModelSchema>;

export const CatalogItemSchema = z.object({
  code: z.string(),
  labelEn: z.string(),
  labelIt: z.string(),
  category: z.string(),
  priceModel: PriceModelSchema,
  amountCents: z.number().int().nullable().optional(),
  ratePercent: z.number().nullable().optional(),
  ivaApplicable: z.boolean(),
});
export type CatalogItem = z.infer<typeof CatalogItemSchema>;

export const ServicePackageSchema = z.object({
  code: z.string(),
  labelEn: z.string(),
  labelIt: z.string(),
  includes: z.array(z.string()),
  bundleFixedCents: z.number().int().nullable().optional(),
});
export type ServicePackage = z.infer<typeof ServicePackageSchema>;

export const QuoteLineSchema = z.object({
  code: z.string(),
  labelEn: z.string(),
  labelIt: z.string(),
  kind: z.enum(['fixed', 'provvigione', 'passthrough', 'bundle']),
  netCents: z.number().int(),
  ivaCents: z.number().int(),
  grossCents: z.number().int(),
  estimated: z.boolean(),
  note: z.string().optional(),
});
export type QuoteLine = z.infer<typeof QuoteLineSchema>;

export const QuoteSchema = z.object({
  lines: z.array(QuoteLineSchema),
  fixedNetCents: z.number().int(),
  provvigioneEstimatedNetCents: z.number().int(),
  passthroughCents: z.number().int(),
  ivaCents: z.number().int(),
  dueNowGrossCents: z.number().int(),
  estimatedTotalGrossCents: z.number().int(),
  currency: z.literal('EUR'),
});
export type Quote = z.infer<typeof QuoteSchema>;

export interface QuoteRequest {
  items?: string[];
  packageCode?: string;
  referenceValueCents?: number;
}

/* ------------------------------------------------------------------ */
/* Fascicolo                                                           */
/* ------------------------------------------------------------------ */

export const BlockerSchema = z.object({
  document: z.string(),
  code: z.enum(['MISSING', 'EXPIRED', 'UNVERIFIED']),
  messageEn: z.string(),
  messageIt: z.string(),
});
export type Blocker = z.infer<typeof BlockerSchema>;

export const GateResultSchema = z.object({
  gate: z.enum(['PUBLISH', 'CLOSE', 'REGISTER_LEASE']),
  allowed: z.boolean(),
  blockers: z.array(BlockerSchema),
  warnings: z.array(BlockerSchema),
});
export type GateResult = z.infer<typeof GateResultSchema>;

export const FascicoloEvaluationSchema = z.object({
  publish: GateResultSchema,
  close: GateResultSchema,
  registerLease: GateResultSchema,
});
export type FascicoloEvaluation = z.infer<typeof FascicoloEvaluationSchema>;

export const ChecklistEntrySchema = z.object({
  code: z.string(),
  labelEn: z.string(),
  labelIt: z.string(),
  present: z.boolean(),
  verified: z.boolean(),
});
export type ChecklistEntry = z.infer<typeof ChecklistEntrySchema>;

export const DocumentInstanceSchema = z.object({
  code: z.string(),
  issuedAt: z.string().optional(),
  verifiedAt: z.string().optional(),
});
export type DocumentInstance = z.infer<typeof DocumentInstanceSchema>;

export const FascicoloViewSchema = z.object({
  propertyId: z.string(),
  documents: z.array(DocumentInstanceSchema),
  checklist: z.array(ChecklistEntrySchema),
  gates: FascicoloEvaluationSchema,
});
export type FascicoloView = z.infer<typeof FascicoloViewSchema>;

/* Owner property summary (endpoint noted as a Phase 9 backend dependency). */
export const OwnerPropertySchema = z.object({
  id: z.string(),
  dealType: z.enum(['sale', 'rent']),
  status: z.string(),
  title: z.string().nullable(),
  inCondominio: z.boolean(),
});
export type OwnerProperty = z.infer<typeof OwnerPropertySchema>;

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

export class EasyCasaOwnerApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(private readonly opts: RequesterOptions) {
    this.request = createRequester(opts);
  }
  listCatalog(): Promise<CatalogItem[]> {
    return this.request('/service-catalog', z.array(CatalogItemSchema));
  }

  listPackages(): Promise<ServicePackage[]> {
    return this.request('/service-catalog/packages', z.array(ServicePackageSchema));
  }

  createQuote(body: QuoteRequest): Promise<Quote> {
    return this.request('/service-catalog/quote', QuoteSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  listMyProperties(): Promise<OwnerProperty[]> {
    return this.request('/me/properties', z.array(OwnerPropertySchema));
  }

  presignUpload(body: { filename: string; contentType: string }): Promise<{
    uploadUrl: string;
    fileUrl: string;
  }> {
    return this.request(
      '/uploads/presign',
      z.object({ uploadUrl: z.string(), fileUrl: z.string() }),
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  getFascicolo(propertyId: string): Promise<FascicoloView> {
    return this.request(
      `/properties/${encodeURIComponent(propertyId)}/fascicolo`,
      FascicoloViewSchema,
    );
  }

  getGates(propertyId: string): Promise<FascicoloEvaluation> {
    return this.request(
      `/properties/${encodeURIComponent(propertyId)}/fascicolo/gates`,
      FascicoloEvaluationSchema,
    );
  }

  addDocument(
    propertyId: string,
    body: { code: string; url: string; issuedAt?: string },
  ): Promise<FascicoloEvaluation> {
    return this.request(
      `/properties/${encodeURIComponent(propertyId)}/fascicolo/documents`,
      FascicoloEvaluationSchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  /** Persist an accepted quote as a confirmed ServiceOrder (Phase 10 Order shape). */
  acceptQuote(propertyId: string, body: QuoteRequest): Promise<Order> {
    return this.request(
      `/properties/${encodeURIComponent(propertyId)}/orders`,
      OrderSchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }
}
