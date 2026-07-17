import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { assignments, professionals, serviceTasks } from '../db/schema';
import type {
  AssignmentRecord,
  AssignmentRepository,
  TaskRecord,
} from '../professionals/domain/ports';
import type { AssignmentStatus, RequiredCredential } from '../professionals/domain/types';
import {
  toDbAssignmentStatus,
  toDomainAssignmentStatus,
} from '../professionals/status-map';

@Injectable()
export class DrizzleAssignmentRepository implements AssignmentRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async createTask(input: Omit<TaskRecord, 'id'>): Promise<TaskRecord> {
    const rows = await this.db
      .insert(serviceTasks)
      .values({
        orderId: input.orderId,
        propertyId: input.propertyId,
        itemCode: input.itemCode,
        requiredCredential: input.requiredCredential,
        province: input.province,
      })
      .returning();
    return this.toTask(rows[0]!);
  }

  async getTask(id: string): Promise<TaskRecord | null> {
    const rows = await this.db.select().from(serviceTasks).where(eq(serviceTasks.id, id)).limit(1);
    return rows[0] ? this.toTask(rows[0]) : null;
  }

  async createAssignment(taskId: string): Promise<AssignmentRecord> {
    const rows = await this.db
      .insert(assignments)
      .values({ taskId, status: 'requested' })
      .returning();
    return this.toAssignment(rows[0]!);
  }

  async getAssignment(id: string): Promise<AssignmentRecord | null> {
    const rows = await this.db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    return rows[0] ? this.toAssignment(rows[0]) : null;
  }

  async listAssignments(filter?: { status?: AssignmentStatus }): Promise<AssignmentRecord[]> {
    if (filter?.status) {
      const rows = await this.db
        .select()
        .from(assignments)
        .where(eq(assignments.status, toDbAssignmentStatus(filter.status)));
      return rows.map((r) => this.toAssignment(r));
    }
    const rows = await this.db.select().from(assignments);
    return rows.map((r) => this.toAssignment(r));
  }

  async listForProfessional(professionalId: string): Promise<AssignmentRecord[]> {
    const rows = await this.db
      .select()
      .from(assignments)
      .where(eq(assignments.professionalId, professionalId));
    return rows.map((r) => this.toAssignment(r));
  }

  async setProfessional(assignmentId: string, professionalId: string): Promise<void> {
    await this.db
      .update(assignments)
      .set({ professionalId, updatedAt: new Date() })
      .where(eq(assignments.id, assignmentId));
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

  async assignAtomic(input: {
    assignmentId: string;
    professionalId: string;
    status: AssignmentStatus;
  }): Promise<AssignmentRecord> {
    return this.db.transaction(async (tx) => {
      await tx
        .update(assignments)
        .set({
          professionalId: input.professionalId,
          status: toDbAssignmentStatus(input.status),
          updatedAt: new Date(),
        })
        .where(eq(assignments.id, input.assignmentId));
      await tx
        .update(professionals)
        .set({
          activeAssignments: sql`${professionals.activeAssignments} + 1`,
        })
        .where(eq(professionals.id, input.professionalId));
      const rows = await tx
        .select()
        .from(assignments)
        .where(eq(assignments.id, input.assignmentId))
        .limit(1);
      return this.toAssignment(rows[0]!);
    });
  }

  private toTask(row: typeof serviceTasks.$inferSelect): TaskRecord {
    return {
      id: row.id,
      orderId: row.orderId,
      propertyId: row.propertyId,
      itemCode: row.itemCode,
      requiredCredential: row.requiredCredential as RequiredCredential,
      province: row.province,
    };
  }

  private toAssignment(row: typeof assignments.$inferSelect): AssignmentRecord {
    return {
      id: row.id,
      taskId: row.taskId,
      professionalId: row.professionalId,
      status: toDomainAssignmentStatus(row.status),
      deliverableUrl: row.deliverableUrl,
    };
  }
}
