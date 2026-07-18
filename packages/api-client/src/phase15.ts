/**
 * Phase 15 client surface — the professional portal. Consumes the `/me/*`
 * professional endpoints (profile, enriched assignment inbox, ownership-checked
 * start/deliver) plus credential submission.
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';

export type ProCredential = {
  type:
    | 'REA_MEDIATORE'
    | 'RC_INSURANCE'
    | 'ALBO_TECNICO'
    | 'APE_CERTIFIER'
    | 'PHOTOGRAPHER'
    | 'NOTAIO';
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  reference: string | null;
  expiresAt: string | null;
};

export type ProProfile = {
  id: string;
  coverageProvinces: string[];
  activeAssignments: number;
  maxConcurrent: number;
  credentials: ProCredential[];
};

const CredentialRawSchema = z.object({
  type: z.enum([
    'REA_MEDIATORE',
    'RC_INSURANCE',
    'ALBO_TECNICO',
    'APE_CERTIFIER',
    'PHOTOGRAPHER',
    'NOTAIO',
  ]),
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']),
  reference: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

export const CredentialSchema = CredentialRawSchema.transform((c) => ({
  type: c.type,
  status: c.status,
  reference: c.reference ?? null,
  expiresAt: c.expiresAt ?? null,
})) as z.ZodType<ProCredential>;

export const ProProfileSchema = z
  .object({
    id: z.string(),
    coverageProvinces: z.array(z.string()),
    activeAssignments: z.number().int(),
    maxConcurrent: z.number().int(),
    credentials: z.array(CredentialRawSchema),
  })
  .transform((p) => ({
    id: p.id,
    coverageProvinces: p.coverageProvinces,
    activeAssignments: p.activeAssignments,
    maxConcurrent: p.maxConcurrent,
    credentials: p.credentials.map((c) => ({
      type: c.type,
      status: c.status,
      reference: c.reference ?? null,
      expiresAt: c.expiresAt ?? null,
    })),
  })) as z.ZodType<ProProfile>;

export const AssignmentStatusSchema = z.enum([
  'REQUESTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'DELIVERED',
  'APPROVED',
]);
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

export const ProAssignmentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  status: AssignmentStatusSchema,
  deliverableUrl: z.string().nullable(),
  task: z
    .object({
      itemCode: z.string(),
      propertyId: z.string(),
      requiredCredential: z.string(),
      province: z.string(),
    })
    .nullable(),
});
export type ProAssignment = z.infer<typeof ProAssignmentSchema>;

export class EasyCasaProfessionalApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(private readonly opts: RequesterOptions) {
    this.request = createRequester(opts);
  }

  getMyProfile(): Promise<ProProfile> {
    return this.request('/me/professional', ProProfileSchema);
  }

  getMyAssignments(): Promise<ProAssignment[]> {
    return this.request('/me/assignments', z.array(ProAssignmentSchema));
  }

  start(assignmentId: string): Promise<ProAssignment> {
    return this.request(
      `/me/assignments/${encodeURIComponent(assignmentId)}/start`,
      ProAssignmentSchema,
      { method: 'POST' },
    );
  }

  deliver(assignmentId: string, deliverableUrl: string): Promise<ProAssignment> {
    return this.request(
      `/me/assignments/${encodeURIComponent(assignmentId)}/deliver`,
      ProAssignmentSchema,
      {
        method: 'POST',
        body: JSON.stringify({ deliverableUrl }),
      },
    );
  }

  submitCredential(
    professionalId: string,
    body: { type: ProCredential['type']; reference?: string; expiresAt?: string },
  ): Promise<ProProfile> {
    return this.request(
      `/professionals/${encodeURIComponent(professionalId)}/credentials`,
      ProProfileSchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }
}
