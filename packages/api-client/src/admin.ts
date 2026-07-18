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
  'APE_CERTIFIER',
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
  verifyCredential(
    professionalId: string,
    body: { type: CredentialType; status: 'VERIFIED' | 'REJECTED' },
  ): Promise<Professional> {
    return this.request(
      `/professionals/${encodeURIComponent(professionalId)}/credentials/status`,
      ProfessionalSchema,
      { method: 'PUT', body: JSON.stringify(body) },
    );
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
