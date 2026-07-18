/**
 * Phase 12 client surface — rentals (lease + RLI) and AML/KYC. Powers the
 * owner-portal rental flow and the admin AML back office.
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';

/* Lease ---------------------------------------------------------------- */

export const LeaseTypeSchema = z.enum(['LIBERO_4_4', 'CONCORDATO_3_2', 'TRANSITORIO', 'STUDENTI']);
export type LeaseType = z.infer<typeof LeaseTypeSchema>;

export interface LeaseInput {
  type: LeaseType;
  startAt: string;
  durationMonths: number;
  annualRentCents: number;
  cedolareSecca: boolean;
  highTension: boolean;
  apeAttached: boolean;
  signedAt?: string;
}

export const LeaseIssueSchema = z.object({
  code: z.string(),
  messageEn: z.string(),
  messageIt: z.string(),
});

export const LeaseValidationSchema = z.object({
  valid: z.boolean(),
  cedolareRate: z.union([z.literal(0), z.literal(0.1), z.literal(0.21)]),
  blockers: z.array(LeaseIssueSchema),
  warnings: z.array(LeaseIssueSchema),
});
export type LeaseValidation = z.infer<typeof LeaseValidationSchema>;

export const LeaseSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  type: LeaseTypeSchema,
  startAt: z.string(),
  durationMonths: z.number().int(),
  annualRentCents: z.number().int(),
  cedolareSecca: z.boolean(),
  highTension: z.boolean(),
  apeAttached: z.boolean(),
  signedAt: z.string().optional(),
  registrationProtocollo: z.string().nullable(),
  registeredAt: z.string().nullable(),
});
export type Lease = z.infer<typeof LeaseSchema>;

export const RegistrationTaxesSchema = z.object({
  cedolare: z.boolean(),
  registroCents: z.number().int(),
  bolloCents: z.number().int(),
  totalCents: z.number().int(),
  note: z.string(),
});

export const RliPayloadSchema = z.object({
  adempimento: z.enum(['REGISTRAZIONE', 'PROROGA', 'RISOLUZIONE', 'CESSIONE', 'ANNUALITA']),
  leaseType: LeaseTypeSchema,
  startAt: z.string(),
  durationMonths: z.number().int(),
  annualRentCents: z.number().int(),
  cedolareSecca: z.boolean(),
  cedolareRate: z.union([z.literal(0), z.literal(0.1), z.literal(0.21)]),
  registrationDeadline: z.string(),
  taxes: RegistrationTaxesSchema,
});
export type RliPayload = z.infer<typeof RliPayloadSchema>;

/* AML ------------------------------------------------------------------ */

export const KycStatusSchema = z.enum(['OPEN', 'VERIFIED', 'ESCALATED', 'CLEARED']);
export type KycStatus = z.infer<typeof KycStatusSchema>;

export const KycCaseSchema = z.object({
  id: z.string(),
  subjectRef: z.string(),
  assessment: z.object({
    level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    measure: z.enum(['ORDINARY', 'ENHANCED']),
    mustEscalate: z.boolean(),
    score: z.number().int(),
  }),
  status: KycStatusSchema,
});
export type KycCase = z.infer<typeof KycCaseSchema>;

/* Client --------------------------------------------------------------- */

export class EasyCasaRentalsApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(private readonly opts: RequesterOptions) {
    this.request = createRequester(opts);
  }

  previewLease(input: LeaseInput): Promise<LeaseValidation> {
    return this.request('/leases/preview', LeaseValidationSchema, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  createLease(propertyId: string, input: LeaseInput): Promise<Lease> {
    return this.request(
      `/properties/${encodeURIComponent(propertyId)}/leases`,
      LeaseSchema,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }

  getLease(id: string): Promise<Lease> {
    return this.request(`/leases/${encodeURIComponent(id)}`, LeaseSchema);
  }

  getRliPayload(leaseId: string): Promise<RliPayload> {
    return this.request(`/leases/${encodeURIComponent(leaseId)}/rli-payload`, RliPayloadSchema);
  }

  registerLease(
    leaseId: string,
    body?: {
      tenantSubjectRef?: string;
      tenantFullName?: string;
      tenantCountryCode?: string;
    },
  ): Promise<Lease> {
    return this.request(`/leases/${encodeURIComponent(leaseId)}/register`, LeaseSchema, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
  }

  openKyc(body: {
    subjectRef: string;
    fullName: string;
    countryCode: string;
    nonEuId: boolean;
    cashPayment: boolean;
    highValue: boolean;
    identityMismatch: boolean;
  }): Promise<KycCase> {
    return this.request('/aml/cases', KycCaseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  getKyc(id: string): Promise<KycCase> {
    return this.request(`/aml/cases/${encodeURIComponent(id)}`, KycCaseSchema);
  }

  advanceKyc(id: string, event: 'VERIFY' | 'ESCALATE' | 'CLEAR' | 'REOPEN'): Promise<KycCase> {
    return this.request(`/aml/cases/${encodeURIComponent(id)}/events`, KycCaseSchema, {
      method: 'POST',
      body: JSON.stringify({ event }),
    });
  }
}
