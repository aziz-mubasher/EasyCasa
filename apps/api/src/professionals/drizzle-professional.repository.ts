import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { credentials, professionals } from '../db/schema';
import type { ProfessionalRepository } from './domain/ports';
import type { Credential, Professional, VerificationStatus } from './domain/types';
import { toDbVerification, toDomainVerification } from './status-map';

@Injectable()
export class DrizzleProfessionalRepository implements ProfessionalRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async create(input: {
    displayName: string;
    coverageProvinces: string[];
    maxConcurrent?: number;
  }): Promise<Professional> {
    const rows = await this.db
      .insert(professionals)
      .values({
        displayName: input.displayName,
        coverageProvinces: input.coverageProvinces,
        maxConcurrent: input.maxConcurrent ?? 5,
      })
      .returning();
    return this.toDomain(rows[0]!, []);
  }

  async get(id: string): Promise<Professional | null> {
    const rows = await this.db
      .select()
      .from(professionals)
      .where(eq(professionals.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const creds = await this.db
      .select()
      .from(credentials)
      .where(eq(credentials.professionalId, id));
    return this.toDomain(row, creds);
  }

  async list(): Promise<Professional[]> {
    const rows = await this.db.select().from(professionals);
    const allCreds = await this.db.select().from(credentials);
    const byPro = new Map<string, typeof allCreds>();
    for (const c of allCreds) {
      const list = byPro.get(c.professionalId) ?? [];
      list.push(c);
      byPro.set(c.professionalId, list);
    }
    return rows.map((r) => this.toDomain(r, byPro.get(r.id) ?? []));
  }

  async addCredential(id: string, credential: Credential): Promise<void> {
    await this.db.insert(credentials).values({
      professionalId: id,
      type: credential.type,
      status: toDbVerification(credential.status),
      reference: credential.reference ?? null,
      expiresAt: credential.expiresAt ? new Date(credential.expiresAt) : null,
    });
  }

  async setCredentialStatus(
    id: string,
    type: Credential['type'],
    status: Credential['status'],
  ): Promise<void> {
    await this.db
      .update(credentials)
      .set({ status: toDbVerification(status) })
      .where(and(eq(credentials.professionalId, id), eq(credentials.type, type)));
  }

  async incrementLoad(id: string, delta: number): Promise<void> {
    await this.db
      .update(professionals)
      .set({
        activeAssignments: sql`${professionals.activeAssignments} + ${delta}`,
      })
      .where(eq(professionals.id, id));
  }

  private toDomain(
    row: typeof professionals.$inferSelect,
    creds: (typeof credentials.$inferSelect)[],
  ): Professional {
    return {
      id: row.id,
      coverageProvinces: row.coverageProvinces ?? [],
      activeAssignments: row.activeAssignments,
      maxConcurrent: row.maxConcurrent,
      credentials: creds.map((c) => ({
        type: c.type as Credential['type'],
        status: toDomainVerification(c.status) as VerificationStatus,
        ...(c.reference ? { reference: c.reference } : {}),
        ...(c.expiresAt ? { expiresAt: c.expiresAt.toISOString() } : {}),
      })),
    };
  }
}
