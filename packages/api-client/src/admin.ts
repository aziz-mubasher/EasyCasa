/**
 * @easycasa/api-client — admin surface (Phase 13).
 *
 * Aggregator for the back-office console: orchestration, credential
 * verification, compliance config, AML, and RLI monitoring. Reuses Phase 11/12
 * schemas where shapes match the live API.
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';
import {
  AssignmentSchema,
  CandidateSchema,
  CredentialTypeSchema,
  ProfessionalSchema,
  type Assignment,
  type Candidate,
  type CredentialType,
  type Professional,
} from './phase11';
import { KycCaseSchema, LeaseSchema, type KycCase, type Lease } from './phase12';

export type { Assignment, Candidate, CredentialType, Professional, KycCase, Lease };

/* Compliance config (Phase 10 + 11) ------------------------------------ */

export const LegalBasisSchema = z.enum(['MEDIAZIONE', 'MANDATO_ONEROSO', 'REVIEW_REQUIRED']);
export type LegalBasis = z.infer<typeof LegalBasisSchema>;

export const RequiredCredentialSchema = z.enum([
  'REA_MEDIATORE',
  'ALBO_TECNICO',
  'ALBO_ISCRIZIONE',
  'APE_CERTIFIER',
  'CENED_ACCREDITAMENTO',
  'PHOTOGRAPHER',
  'NOTAIO',
  'NONE',
]);
export type RequiredCredential = z.infer<typeof RequiredCredentialSchema>;

/** Catalog row enriched with compliance fields for the admin console. */
export const AdminCatalogItemSchema = z.object({
  code: z.string(),
  labelEn: z.string(),
  labelIt: z.string(),
  category: z.string(),
  priceModel: z.enum(['fixed', 'provvigione', 'passthrough']),
  legalBasis: LegalBasisSchema.optional(),
  requiredCredential: RequiredCredentialSchema.optional(),
});
export type AdminCatalogItem = z.infer<typeof AdminCatalogItemSchema>;

/** @deprecated Prefer AdminCatalogItem — alias for console pages. */
export type CatalogItem = AdminCatalogItem;
export const CatalogItemSchema = AdminCatalogItemSchema;

/** EC-10 — province × item coverage cell for recruiting board. */
export const CoverageMatrixCellSchema = z.object({
  itemCode: z.string(),
  province: z.string(),
  available: z.boolean(),
  qualifiedCount: z.number(),
  capacityConstrained: z.boolean(),
  demandCount: z.number(),
});
export type CoverageMatrixCell = z.infer<typeof CoverageMatrixCellSchema>;

export const CoverageDemandRowSchema = z.object({
  id: z.string(),
  itemCode: z.string(),
  province: z.string(),
  userId: z.string().nullable(),
  createdAt: z.union([z.string(), z.coerce.date()]),
});
export type CoverageDemandRow = z.infer<typeof CoverageDemandRowSchema>;

/* Client --------------------------------------------------------------- */

export class EasyCasaAdminApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(private readonly opts: RequesterOptions) {
    this.request = createRequester(opts);
  }

  /* Orchestration */
  listOpenAssignments(): Promise<Assignment[]> {
    return this.request('/assignments?status=open', z.array(AssignmentSchema));
  }
  candidates(assignmentId: string): Promise<Candidate[]> {
    return this.request(
      `/assignments/${encodeURIComponent(assignmentId)}/candidates`,
      z.array(CandidateSchema),
    );
  }
  assign(assignmentId: string, professionalId: string): Promise<Assignment> {
    return this.request(`/assignments/${encodeURIComponent(assignmentId)}/assign`, AssignmentSchema, {
      method: 'POST',
      body: JSON.stringify({ professionalId }),
    });
  }
  approve(assignmentId: string): Promise<Assignment> {
    return this.request(`/assignments/${encodeURIComponent(assignmentId)}/approve`, AssignmentSchema, {
      method: 'POST',
    });
  }

  /* Credentials */
  listProfessionals(): Promise<Professional[]> {
    return this.request('/professionals', z.array(ProfessionalSchema));
  }
  unredactProfessional(professionalId: string, reason: string): Promise<Professional> {
    return this.request(
      `/professionals/${encodeURIComponent(professionalId)}/unredact`,
      ProfessionalSchema,
      { method: 'POST', body: JSON.stringify({ reason }) },
    );
  }
  verifyCredential(
    professionalId: string,
    body: { type: CredentialType; status: 'VERIFIED' | 'REJECTED'; reason: string },
  ): Promise<Professional> {
    return this.request(
      `/professionals/${encodeURIComponent(professionalId)}/credentials/status`,
      ProfessionalSchema,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }
  setCoverage(professionalId: string, coverageProvinces: string[]): Promise<Professional> {
    return this.request(
      `/professionals/${encodeURIComponent(professionalId)}/coverage`,
      ProfessionalSchema,
      { method: 'PATCH', body: JSON.stringify({ coverageProvinces }) },
    );
  }
  addCredential(
    professionalId: string,
    body: {
      type: CredentialType;
      reference?: string;
      expiresAt?: string;
      documentUrl?: string;
    },
  ): Promise<Professional> {
    return this.request(
      `/professionals/${encodeURIComponent(professionalId)}/credentials`,
      ProfessionalSchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }
  createProfessional(body: {
    displayName: string;
    coverageProvinces: string[];
    maxConcurrent?: number;
  }): Promise<Professional> {
    return this.request('/professionals', ProfessionalSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /* EC-13 DSAR */
  listDsar(): Promise<unknown[]> {
    return this.request('/admin/dsar', z.array(z.unknown()));
  }
  dsarLegalHolds(): Promise<{ it: string[]; en: string[] }> {
    return this.request(
      '/admin/dsar/legal-holds',
      z.object({ it: z.array(z.string()), en: z.array(z.string()) }),
    );
  }
  createDsar(body: {
    subjectEmail: string;
    requestType: string;
    subjectUserId?: string;
  }): Promise<unknown> {
    return this.request('/admin/dsar', z.unknown(), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
  exportDsar(id: string): Promise<unknown> {
    return this.request(`/admin/dsar/${encodeURIComponent(id)}/export`, z.unknown(), {
      method: 'POST',
    });
  }
  eraseDsar(id: string): Promise<unknown> {
    return this.request(`/admin/dsar/${encodeURIComponent(id)}/erase`, z.unknown(), {
      method: 'POST',
    });
  }
  respondDsar(id: string, responseNote: string): Promise<unknown> {
    return this.request(`/admin/dsar/${encodeURIComponent(id)}/response`, z.unknown(), {
      method: 'PUT',
      body: JSON.stringify({ responseNote }),
    });
  }

  /* EC-13 listing reports */
  listListingReports(): Promise<unknown[]> {
    return this.request('/admin/listing-reports', z.array(z.unknown()));
  }
  decideListingReport(
    id: string,
    body: { decision: 'removed' | 'kept' | 'more_info'; motivation: string },
  ): Promise<unknown> {
    return this.request(`/admin/listing-reports/${encodeURIComponent(id)}/decision`, z.unknown(), {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /* EC-13 identity */
  listIdentityReviews(): Promise<unknown[]> {
    return this.request('/admin/identity-reviews', z.array(z.unknown()));
  }
  viewIdentityReview(id: string): Promise<unknown> {
    return this.request(`/admin/identity-reviews/${encodeURIComponent(id)}`, z.unknown());
  }
  verifyIdentityReview(id: string): Promise<unknown> {
    return this.request(`/admin/identity-reviews/${encodeURIComponent(id)}/verify`, z.unknown(), {
      method: 'PUT',
    });
  }
  rejectIdentityReview(id: string, reason: string): Promise<unknown> {
    return this.request(`/admin/identity-reviews/${encodeURIComponent(id)}/reject`, z.unknown(), {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  /* Compliance config */
  listCatalog(): Promise<AdminCatalogItem[]> {
    return this.request('/admin/catalog', z.array(AdminCatalogItemSchema));
  }
  setLegalBasis(code: string, legalBasis: LegalBasis): Promise<AdminCatalogItem> {
    return this.request(
      `/admin/catalog/${encodeURIComponent(code)}/legal-basis`,
      AdminCatalogItemSchema,
      { method: 'PUT', body: JSON.stringify({ legalBasis }) },
    );
  }
  setRequiredCredential(
    code: string,
    requiredCredential: RequiredCredential,
  ): Promise<AdminCatalogItem> {
    return this.request(
      `/admin/catalog/${encodeURIComponent(code)}/credential`,
      AdminCatalogItemSchema,
      { method: 'PUT', body: JSON.stringify({ requiredCredential }) },
    );
  }

  /* EC-10 coverage */
  coverageMatrix(provinces?: string[]): Promise<CoverageMatrixCell[]> {
    const q =
      provinces && provinces.length > 0
        ? `?provinces=${encodeURIComponent(provinces.join(','))}`
        : '';
    return this.request(`/admin/coverage-matrix${q}`, z.array(CoverageMatrixCellSchema));
  }
  coverageDemand(limit = 50): Promise<CoverageDemandRow[]> {
    return this.request(
      `/admin/coverage-demand?limit=${encodeURIComponent(String(limit))}`,
      z.array(CoverageDemandRowSchema),
    );
  }

  /* AML */
  listKycCases(): Promise<KycCase[]> {
    return this.request('/aml/cases', z.array(KycCaseSchema));
  }
  advanceKyc(id: string, event: 'VERIFY' | 'ESCALATE' | 'CLEAR' | 'REOPEN'): Promise<KycCase> {
    return this.request(`/aml/cases/${encodeURIComponent(id)}/events`, KycCaseSchema, {
      method: 'POST',
      body: JSON.stringify({ event }),
    });
  }

  /* RLI monitor */
  listLeases(): Promise<Lease[]> {
    return this.request('/leases', z.array(LeaseSchema));
  }
}

export { CredentialTypeSchema, ProfessionalSchema, AssignmentSchema, CandidateSchema, KycCaseSchema, LeaseSchema };
