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

  /* EC-S-T19 abuse */
  listAbuseFlaggedMedia(): Promise<unknown[]> {
    return this.request('/admin/abuse/flagged-media', z.array(z.unknown()));
  }
  listAbuseRepeatOffenders(days?: number, min?: number): Promise<unknown[]> {
    const q = new URLSearchParams();
    if (days != null) q.set('days', String(days));
    if (min != null) q.set('min', String(min));
    const suffix = q.toString() ? `?${q}` : '';
    return this.request(`/admin/abuse/repeat-offenders${suffix}`, z.array(z.unknown()));
  }
  suspendAbuseUser(userId: string, reason: string): Promise<unknown> {
    return this.request(`/admin/abuse/users/${encodeURIComponent(userId)}/suspend`, z.unknown(), {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
  unsuspendAbuseUser(userId: string): Promise<unknown> {
    return this.request(`/admin/abuse/users/${encodeURIComponent(userId)}/unsuspend`, z.unknown(), {
      method: 'POST',
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

  /* EC-S-T15 Verified Owner queue */
  listVoQueue(state?: 'submitted' | 'in_review'): Promise<unknown[]> {
    const q = state ? `?state=${encodeURIComponent(state)}` : '';
    return this.request(`/admin/vo/queue${q}`, z.array(z.unknown()));
  }
  getVoCase(id: string): Promise<unknown> {
    return this.request(`/admin/vo/${encodeURIComponent(id)}`, z.unknown());
  }
  claimVoCase(id: string): Promise<unknown> {
    return this.request(`/admin/vo/${encodeURIComponent(id)}/claim`, z.unknown(), {
      method: 'POST',
    });
  }
  verifyVoCase(id: string): Promise<unknown> {
    return this.request(`/admin/vo/${encodeURIComponent(id)}/verify`, z.unknown(), {
      method: 'POST',
    });
  }
  rejectVoCase(id: string, reason: string): Promise<unknown> {
    return this.request(`/admin/vo/${encodeURIComponent(id)}/reject`, z.unknown(), {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  /* EC-S-T28 partner directory */
  listPartnerDirectory(): Promise<unknown[]> {
    return this.request('/admin/partner-directory', z.array(z.unknown()));
  }
  createPartnerDirectory(body: {
    category: string;
    name: string;
    province: string;
    credentials?: string;
    contact: string;
    active?: boolean;
  }): Promise<unknown> {
    return this.request('/admin/partner-directory', z.unknown(), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
  updatePartnerDirectory(
    id: string,
    body: {
      category: string;
      name: string;
      province: string;
      credentials?: string;
      contact: string;
      active?: boolean;
    },
  ): Promise<unknown> {
    return this.request(
      `/admin/partner-directory/${encodeURIComponent(id)}`,
      z.unknown(),
      { method: 'PATCH', body: JSON.stringify(body) },
    );
  }
  deletePartnerDirectory(id: string): Promise<unknown> {
    return this.request(
      `/admin/partner-directory/${encodeURIComponent(id)}`,
      z.unknown(),
      { method: 'DELETE' },
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

  /* EC-19 / EC WhatsApp inbound (read-only) */
  listWhatsAppInbound(params?: {
    window?: 'open' | 'closed';
    autoReplied?: boolean;
    cursor?: string;
    limit?: number;
  }): Promise<unknown> {
    const q = new URLSearchParams();
    if (params?.window) q.set('window', params.window);
    if (params?.autoReplied != null) q.set('autoReplied', String(params.autoReplied));
    if (params?.cursor) q.set('cursor', params.cursor);
    if (params?.limit != null) q.set('limit', String(params.limit));
    const qs = q.toString();
    return this.request(`/admin/whatsapp/inbound${qs ? `?${qs}` : ''}`, z.unknown());
  }
  getWhatsAppInboundSummary(): Promise<unknown> {
    return this.request('/admin/whatsapp/inbound/summary', z.unknown());
  }
  getWhatsAppInbound(handle: string, params?: { cursor?: string; limit?: number }): Promise<unknown> {
    const q = new URLSearchParams();
    if (params?.cursor) q.set('cursor', params.cursor);
    if (params?.limit != null) q.set('limit', String(params.limit));
    const qs = q.toString();
    return this.request(
      `/admin/whatsapp/inbound/${encodeURIComponent(handle)}${qs ? `?${qs}` : ''}`,
      z.unknown(),
    );
  }
  replyWhatsAppInbound(handle: string, body: string): Promise<unknown> {
    return this.request(
      `/admin/whatsapp/inbound/${encodeURIComponent(handle)}/reply`,
      z.unknown(),
      { method: 'POST', body: JSON.stringify({ body }) },
    );
  }
  listWhatsAppNotes(handle: string): Promise<unknown> {
    return this.request(
      `/admin/whatsapp/inbound/${encodeURIComponent(handle)}/notes`,
      z.unknown(),
    );
  }
  addWhatsAppNote(handle: string, body: string): Promise<unknown> {
    return this.request(
      `/admin/whatsapp/inbound/${encodeURIComponent(handle)}/notes`,
      z.unknown(),
      { method: 'POST', body: JSON.stringify({ body }) },
    );
  }
  setWhatsAppBlocked(handle: string, blocked: boolean): Promise<unknown> {
    return this.request(
      `/admin/whatsapp/inbound/${encodeURIComponent(handle)}/block`,
      z.unknown(),
      { method: 'POST', body: JSON.stringify({ blocked }) },
    );
  }
  getWhatsAppHubConnection(): Promise<unknown> {
    return this.request('/admin/whatsapp/hub/connection', z.unknown());
  }
  getWhatsAppHubTemplates(): Promise<unknown> {
    return this.request('/admin/whatsapp/hub/templates', z.unknown());
  }
  getWhatsAppHubAnalytics(days?: number): Promise<unknown> {
    const q = days != null ? `?days=${encodeURIComponent(String(days))}` : '';
    return this.request(`/admin/whatsapp/hub/analytics${q}`, z.unknown());
  }
  listWhatsAppCanned(): Promise<unknown> {
    return this.request('/admin/whatsapp/hub/canned', z.unknown());
  }
  createWhatsAppCanned(body: { title: string; body: string; locale?: string }): Promise<unknown> {
    return this.request('/admin/whatsapp/hub/canned', z.unknown(), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
  deleteWhatsAppCanned(id: string): Promise<unknown> {
    return this.request(`/admin/whatsapp/hub/canned/${encodeURIComponent(id)}`, z.unknown(), {
      method: 'DELETE',
    });
  }

  /* EC-26 — Aste ops admin */
  listAsteAnalyses(params?: {
    status?: string;
    failuresOnly?: boolean;
    staleMinutes?: number;
    cursor?: string;
    limit?: number;
  }): Promise<unknown> {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.failuresOnly) q.set('failuresOnly', 'true');
    if (params?.staleMinutes != null) q.set('staleMinutes', String(params.staleMinutes));
    if (params?.cursor) q.set('cursor', params.cursor);
    if (params?.limit != null) q.set('limit', String(params.limit));
    const qs = q.toString();
    return this.request(`/admin/aste/analyses${qs ? `?${qs}` : ''}`, z.unknown());
  }
  getAsteAnalysis(id: string): Promise<unknown> {
    return this.request(`/admin/aste/analyses/${encodeURIComponent(id)}`, z.unknown());
  }
  revealAsteIdentity(id: string, reason?: string): Promise<unknown> {
    return this.request(
      `/admin/aste/analyses/${encodeURIComponent(id)}/reveal-identity`,
      z.unknown(),
      { method: 'POST', body: JSON.stringify({ reason }) },
    );
  }
  revealAsteFilenames(id: string, reason?: string): Promise<unknown> {
    return this.request(
      `/admin/aste/analyses/${encodeURIComponent(id)}/reveal-filenames`,
      z.unknown(),
      { method: 'POST', body: JSON.stringify({ reason }) },
    );
  }
  rerunAsteAnalysis(id: string): Promise<unknown> {
    return this.request(
      `/admin/aste/analyses/${encodeURIComponent(id)}/rerun`,
      z.unknown(),
      { method: 'POST', body: '{}' },
    );
  }
  getAsteWaitlistStats(): Promise<unknown> {
    return this.request('/admin/aste/waitlist/stats', z.unknown());
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

  /* K EC 4.1 — Internal CRM */
  crmDashboard(): Promise<{
    metrics: {
      enquiryToViewingRate: number | null;
      medianFirstResponseMinutes: number | null;
      viewingOutcomeRecordedRate: number | null;
      b4aReferralAttestationRate: number | null;
    };
    myTasksDueToday: Array<{
      id: string;
      contactId: string;
      title: string;
      status: string;
      dueAt: string | null;
    }>;
    seekerFunnel: Array<{ stage: string; count: number }>;
    retentionMonths: number;
    crmEnabled: boolean;
  }> {
    return this.request('/admin/crm/dashboard', z.unknown()) as Promise<{
      metrics: {
        enquiryToViewingRate: number | null;
        medianFirstResponseMinutes: number | null;
        viewingOutcomeRecordedRate: number | null;
        b4aReferralAttestationRate: number | null;
      };
      myTasksDueToday: Array<{
        id: string;
        contactId: string;
        title: string;
        status: string;
        dueAt: string | null;
      }>;
      seekerFunnel: Array<{ stage: string; count: number }>;
      retentionMonths: number;
      crmEnabled: boolean;
    }>;
  }

  crmSettings(): Promise<{
    retentionMonths: number;
    crmEnabled: boolean;
    roleMatrix: Array<{ role: string; access: string }>;
    pipelines: Record<string, string[]>;
    gate: string;
  }> {
    return this.request('/admin/crm/settings', z.unknown()) as Promise<{
      retentionMonths: number;
      crmEnabled: boolean;
      roleMatrix: Array<{ role: string; access: string }>;
      pipelines: Record<string, string[]>;
      gate: string;
    }>;
  }

  crmListContacts(params?: {
    query?: string;
    role?: string;
    stage?: string;
    source?: string;
    owner?: string;
    page?: number;
  }): Promise<{
    items: Array<{
      id: string;
      fullName: string;
      email: string | null;
      phone: string | null;
      source: string;
      tags: string[];
      ownerAdminId: string | null;
    }>;
    total: number;
  }> {
    const q = new URLSearchParams();
    if (params?.query) q.set('query', params.query);
    if (params?.role) q.set('role', params.role);
    if (params?.stage) q.set('stage', params.stage);
    if (params?.source) q.set('source', params.source);
    if (params?.owner) q.set('owner', params.owner);
    if (params?.page != null) q.set('page', String(params.page));
    const qs = q.toString();
    return this.request(`/admin/crm/contacts${qs ? `?${qs}` : ''}`, z.unknown()) as Promise<{
      items: Array<{
        id: string;
        fullName: string;
        email: string | null;
        phone: string | null;
        source: string;
        tags: string[];
        ownerAdminId: string | null;
      }>;
      total: number;
    }>;
  }

  crmGetContact(id: string): Promise<{
    contact: {
      id: string;
      fullName: string;
      email: string | null;
      phone: string | null;
      tags: string[];
      notesSummary: string | null;
      source: string;
      locale?: string;
    };
    seeker: {
      stage: string;
      firstEnquiryId: string | null;
      searchIntent?: Record<string, unknown>;
    } | null;
    owner: {
      stage: string;
      preferredChannel: string;
      listingIds: string[];
    } | null;
    b4a: {
      attestationStatus: string;
      bandMaxCents: number | null;
      attestationExpiresAt: string | null;
      holderInitials: string | null;
    } | null;
    partner: {
      partnerType: string;
      stage: string;
      serviceZones: string[];
    } | null;
    recentActivities: Array<{ id: string; type: string; body: string; createdAt: string }>;
    openTasks: Array<{ id: string; title: string; dueAt: string | null; status: string }>;
  }> {
    return this.request(`/admin/crm/contacts/${encodeURIComponent(id)}`, z.unknown()) as ReturnType<
      EasyCasaAdminApi['crmGetContact']
    >;
  }

  crmAddActivity(
    id: string,
    body: { type: 'note' | 'call' | 'email'; body: string },
  ): Promise<unknown> {
    return this.request(
      `/admin/crm/contacts/${encodeURIComponent(id)}/activities`,
      z.unknown(),
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  crmListTasks(params?: {
    assignee?: string;
    status?: string;
    due?: string;
    page?: number;
  }): Promise<{
    items: Array<{
      id: string;
      contactId: string;
      title: string;
      dueAt: string | null;
      status: string;
    }>;
    total: number;
  }> {
    const q = new URLSearchParams();
    if (params?.assignee) q.set('assignee', params.assignee);
    if (params?.status) q.set('status', params.status);
    if (params?.due) q.set('due', params.due);
    if (params?.page != null) q.set('page', String(params.page));
    const qs = q.toString();
    return this.request(`/admin/crm/tasks${qs ? `?${qs}` : ''}`, z.unknown()) as Promise<{
      items: Array<{
        id: string;
        contactId: string;
        title: string;
        dueAt: string | null;
        status: string;
      }>;
      total: number;
    }>;
  }

  crmCreateTask(body: {
    contactId: string;
    title: string;
    dueAt?: string;
    assigneeAdminId?: string;
  }): Promise<{ id: string; title: string; dueAt: string | null; status: string }> {
    return this.request('/admin/crm/tasks', z.unknown(), {
      method: 'POST',
      body: JSON.stringify(body),
    }) as Promise<{ id: string; title: string; dueAt: string | null; status: string }>;
  }

  crmPatchTask(
    id: string,
    body: { title?: string; status?: string; dueAt?: string | null },
  ): Promise<unknown> {
    return this.request(`/admin/crm/tasks/${encodeURIComponent(id)}`, z.unknown(), {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  crmPipeline(role: string): Promise<{
    role: string;
    readOnly: boolean;
    columns: Array<{
      stage: string;
      count: number;
      cards: Array<{
        contactId: string;
        fullName: string;
        email: string | null;
        source?: string;
      }>;
    }>;
  }> {
    return this.request(`/admin/crm/pipelines/${encodeURIComponent(role)}`, z.unknown()) as Promise<{
      role: string;
      readOnly: boolean;
      columns: Array<{
        stage: string;
        count: number;
        cards: Array<{
          contactId: string;
          fullName: string;
          email: string | null;
          source?: string;
        }>;
      }>;
    }>;
  }

  crmPatchRole(
    contactId: string,
    role: string,
    body: { stage?: string; note?: string },
  ): Promise<unknown> {
    return this.request(
      `/admin/crm/contacts/${encodeURIComponent(contactId)}/roles/${encodeURIComponent(role)}`,
      z.unknown(),
      { method: 'PATCH', body: JSON.stringify(body) },
    );
  }
}

export { CredentialTypeSchema, ProfessionalSchema, AssignmentSchema, CandidateSchema, KycCaseSchema, LeaseSchema };
