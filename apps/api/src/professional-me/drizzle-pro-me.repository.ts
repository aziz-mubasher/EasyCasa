import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { assignments, credentials, professionals, serviceTasks } from '../db/schema';
import type { AssignmentStatus } from '../professionals/domain/types';
import {
  toDbAssignmentStatus,
  toDomainAssignmentStatus,
  toDomainVerification,
} from '../professionals/status-map';
import type { ProAssignment, ProMeRepository, ProProfile } from './professional-me.types';

type AssignmentJoinRow = {
  id: string;
  taskId: string;
  status: string;
  deliverableUrl: string | null;
  itemCode: string | null;
  propertyId: string | null;
  requiredCredential: string | null;
  province: string | null;
};

@Injectable()
export class DrizzleProMeRepository implements ProMeRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findProfessionalByUser(userId: string): Promise<ProProfile | null> {
    const rows = await this.db
      .select()
      .from(professionals)
      .where(eq(professionals.userId, userId))
      .limit(1);
    const p = rows[0];
    if (!p) return null;
    const creds = await this.db
      .select()
      .from(credentials)
      .where(eq(credentials.professionalId, p.id));
    return {
      id: p.id,
      coverageProvinces: p.coverageProvinces ?? [],
      activeAssignments: p.activeAssignments,
      maxConcurrent: p.maxConcurrent,
      credentials: creds.map((c) => ({
        type: c.type,
        status: toDomainVerification(c.status),
        reference: c.reference ?? null,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
      })),
    };
  }

  async listAssignments(professionalId: string): Promise<ProAssignment[]> {
    const rows = await this.db
      .select({
        id: assignments.id,
        taskId: assignments.taskId,
        status: assignments.status,
        deliverableUrl: assignments.deliverableUrl,
        itemCode: serviceTasks.itemCode,
        propertyId: serviceTasks.propertyId,
        requiredCredential: serviceTasks.requiredCredential,
        province: serviceTasks.province,
      })
      .from(assignments)
      .leftJoin(serviceTasks, eq(assignments.taskId, serviceTasks.id))
      .where(eq(assignments.professionalId, professionalId))
      .orderBy(desc(assignments.createdAt));

    return rows.map((r) => this.toView(r));
  }

  async ownedAssignment(
    assignmentId: string,
    professionalId: string,
  ): Promise<ProAssignment | null> {
    const rows = await this.db
      .select({
        id: assignments.id,
        taskId: assignments.taskId,
        status: assignments.status,
        deliverableUrl: assignments.deliverableUrl,
        itemCode: serviceTasks.itemCode,
        propertyId: serviceTasks.propertyId,
        requiredCredential: serviceTasks.requiredCredential,
        province: serviceTasks.province,
      })
      .from(assignments)
      .leftJoin(serviceTasks, eq(assignments.taskId, serviceTasks.id))
      .where(
        and(eq(assignments.id, assignmentId), eq(assignments.professionalId, professionalId)),
      )
      .limit(1);
    const r = rows[0];
    return r ? this.toView(r) : null;
  }

  async setStatus(assignmentId: string, status: AssignmentStatus): Promise<void> {
    await this.db
      .update(assignments)
      .set({ status: toDbAssignmentStatus(status), updatedAt: new Date() })
      .where(eq(assignments.id, assignmentId));
  }

  async setDeliverable(assignmentId: string, url: string): Promise<void> {
    await this.db
      .update(assignments)
      .set({ deliverableUrl: url, updatedAt: new Date() })
      .where(eq(assignments.id, assignmentId));
  }

  private toView(r: AssignmentJoinRow): ProAssignment {
    return {
      id: r.id,
      taskId: r.taskId,
      status: toDomainAssignmentStatus(r.status),
      deliverableUrl: r.deliverableUrl,
      task:
        r.itemCode && r.propertyId && r.requiredCredential && r.province
          ? {
              itemCode: r.itemCode,
              propertyId: r.propertyId,
              requiredCredential: r.requiredCredential,
              province: r.province,
            }
          : null,
    };
  }
}
