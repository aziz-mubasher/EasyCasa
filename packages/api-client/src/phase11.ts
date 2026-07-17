/**
 * Phase 11 client surface — professionals & assignments. Powers the admin
 * orchestration board and the professional portal (assignment inbox,
 * deliverable upload).
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';

export const CredentialTypeSchema = z.enum([
  'REA_MEDIATORE',
  'RC_INSURANCE',
  'ALBO_TECNICO',
  'APE_CERTIFIER',
  'PHOTOGRAPHER',
  'NOTAIO',
]);
export type CredentialType = z.infer<typeof CredentialTypeSchema>;

export const VerificationStatusSchema = z.enum(['PENDING', 'VERIFIED', 'REJECTED']);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const CredentialSchema = z.object({
  type: CredentialTypeSchema,
  status: VerificationStatusSchema,
  reference: z.string().optional(),
  expiresAt: z.string().optional(),
});
export type Credential = z.infer<typeof CredentialSchema>;

export const ProfessionalSchema = z.object({
  id: z.string(),
  coverageProvinces: z.array(z.string()),
  credentials: z.array(CredentialSchema),
  activeAssignments: z.number().int(),
  maxConcurrent: z.number().int(),
});
export type Professional = z.infer<typeof ProfessionalSchema>;

export const AssignmentStatusSchema = z.enum([
  'REQUESTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'DELIVERED',
  'APPROVED',
]);
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

export const AssignmentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  professionalId: z.string().nullable(),
  status: AssignmentStatusSchema,
  deliverableUrl: z.string().nullable(),
});
export type Assignment = z.infer<typeof AssignmentSchema>;

export const CandidateSchema = z.object({
  professional: ProfessionalSchema,
  load: z.number().int(),
});
export type Candidate = z.infer<typeof CandidateSchema>;

export class EasyCasaOrchestrationApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(private readonly opts: RequesterOptions) {
    this.request = createRequester(opts);
  }

  /* Admin — professionals & verification */
  listProfessionals(): Promise<Professional[]> {
    return this.request('/professionals', z.array(ProfessionalSchema));
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

  /* Admin — orchestration */
  listAssignments(status?: AssignmentStatus): Promise<Assignment[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/assignments${q}`, z.array(AssignmentSchema));
  }

  createTask(body: {
    orderId: string;
    propertyId: string;
    itemCode: string;
    province: string;
  }): Promise<Assignment> {
    return this.request('/assignments/tasks', AssignmentSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  candidates(assignmentId: string): Promise<Candidate[]> {
    return this.request(
      `/assignments/${encodeURIComponent(assignmentId)}/candidates`,
      z.array(CandidateSchema),
    );
  }

  assign(assignmentId: string, professionalId: string): Promise<Assignment> {
    return this.request(
      `/assignments/${encodeURIComponent(assignmentId)}/assign`,
      AssignmentSchema,
      { method: 'POST', body: JSON.stringify({ professionalId }) },
    );
  }

  start(assignmentId: string): Promise<Assignment> {
    return this.request(
      `/assignments/${encodeURIComponent(assignmentId)}/start`,
      AssignmentSchema,
      { method: 'POST' },
    );
  }

  approve(assignmentId: string): Promise<Assignment> {
    return this.request(
      `/assignments/${encodeURIComponent(assignmentId)}/approve`,
      AssignmentSchema,
      { method: 'POST' },
    );
  }

  /* Professional portal */
  myAssignments(professionalId: string): Promise<Assignment[]> {
    return this.request(
      `/professionals/${encodeURIComponent(professionalId)}/assignments`,
      z.array(AssignmentSchema),
    );
  }

  deliver(assignmentId: string, deliverableUrl: string): Promise<Assignment> {
    return this.request(
      `/assignments/${encodeURIComponent(assignmentId)}/deliver`,
      AssignmentSchema,
      { method: 'POST', body: JSON.stringify({ deliverableUrl }) },
    );
  }
}
