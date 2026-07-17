import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { mandates } from '../db/schema';
import type { MandateRecord, MandateRepository } from '../transactions/domain/ports';
import type {
  MandateDerivation,
  MandateStatus,
  MandateTerms,
  MandateType,
} from '../transactions/domain/types';
import { toDbMandateStatus, toDomainMandateStatus } from '../transactions/status-map';

@Injectable()
export class DrizzleMandateRepository implements MandateRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async create(input: {
    orderId: string;
    propertyId: string;
    derivation: MandateDerivation;
    terms: MandateTerms;
  }): Promise<MandateRecord> {
    const rows = await this.db
      .insert(mandates)
      .values({
        orderId: input.orderId,
        propertyId: input.propertyId,
        types: input.derivation.types,
        reviewRequiredItems: input.derivation.reviewRequiredItems,
        status: 'draft',
        exclusive: input.terms.exclusive,
        durationMonths: input.terms.durationMonths,
      })
      .returning();
    return this.toRecord(rows[0]!);
  }

  async get(id: string): Promise<MandateRecord | null> {
    const rows = await this.db.select().from(mandates).where(eq(mandates.id, id)).limit(1);
    return rows[0] ? this.toRecord(rows[0]) : null;
  }

  async findByEnvelope(envelopeId: string): Promise<MandateRecord | null> {
    const rows = await this.db
      .select()
      .from(mandates)
      .where(eq(mandates.signatureEnvelopeId, envelopeId))
      .limit(1);
    return rows[0] ? this.toRecord(rows[0]) : null;
  }

  async setStatus(id: string, status: MandateStatus): Promise<void> {
    await this.db
      .update(mandates)
      .set({ status: toDbMandateStatus(status) })
      .where(eq(mandates.id, id));
  }

  async attachEnvelope(id: string, envelopeId: string, signingUrl: string): Promise<void> {
    await this.db
      .update(mandates)
      .set({ signatureEnvelopeId: envelopeId, signingUrl })
      .where(eq(mandates.id, id));
  }

  async markSigned(id: string, signedAt: string): Promise<void> {
    await this.db
      .update(mandates)
      .set({ signedAt: new Date(signedAt) })
      .where(eq(mandates.id, id));
  }

  private toRecord(row: typeof mandates.$inferSelect): MandateRecord {
    return {
      id: row.id,
      orderId: row.orderId,
      propertyId: row.propertyId,
      types: (row.types ?? []) as MandateType[],
      reviewRequiredItems: row.reviewRequiredItems ?? [],
      status: toDomainMandateStatus(row.status),
      exclusive: row.exclusive,
      durationMonths: row.durationMonths,
      signatureEnvelopeId: row.signatureEnvelopeId,
      signingUrl: row.signingUrl,
      signedAt: row.signedAt ? row.signedAt.toISOString() : null,
    };
  }
}
