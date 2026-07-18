import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { kycCases } from '../db/schema';
import type { KycCaseRecord, KycRepository } from '../rentals/domain/ports';
import type { AmlAssessment, AmlFactors, KycStatus } from '../rentals/domain/types';
import { toDbKycStatus, toDomainKycStatus } from '../rentals/status-map';

@Injectable()
export class DrizzleKycRepository implements KycRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async create(input: {
    subjectRef: string;
    factors: AmlFactors;
    assessment: AmlAssessment;
    status: KycStatus;
  }): Promise<KycCaseRecord> {
    const rows = await this.db
      .insert(kycCases)
      .values({
        subjectRef: input.subjectRef,
        factors: input.factors,
        riskLevel: input.assessment.level,
        measure: input.assessment.measure,
        mustEscalate: input.assessment.mustEscalate,
        score: input.assessment.score,
        status: toDbKycStatus(input.status),
      })
      .returning();
    return this.toRecord(rows[0]!);
  }

  async get(id: string): Promise<KycCaseRecord | null> {
    const rows = await this.db.select().from(kycCases).where(eq(kycCases.id, id)).limit(1);
    return rows[0] ? this.toRecord(rows[0]) : null;
  }

  async setStatus(id: string, status: KycStatus): Promise<void> {
    await this.db
      .update(kycCases)
      .set({ status: toDbKycStatus(status), updatedAt: new Date() })
      .where(eq(kycCases.id, id));
  }

  async hasOpenEscalation(subjectRef: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: kycCases.id })
      .from(kycCases)
      .where(and(eq(kycCases.subjectRef, subjectRef), eq(kycCases.status, 'escalated')))
      .limit(1);
    return rows.length > 0;
  }

  private toRecord(row: typeof kycCases.$inferSelect): KycCaseRecord {
    return {
      id: row.id,
      subjectRef: row.subjectRef,
      factors: row.factors as AmlFactors,
      assessment: {
        level: row.riskLevel as AmlAssessment['level'],
        measure: row.measure as AmlAssessment['measure'],
        mustEscalate: row.mustEscalate,
        score: row.score,
      },
      status: toDomainKycStatus(row.status),
    };
  }
}
