import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { consentRecords } from '../../db/schema';
import type { ConsentPurpose, ConsentRecord, ConsentStore } from '../consent.service';

@Injectable()
export class DrizzleConsentStore implements ConsentStore {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async append(record: ConsentRecord): Promise<void> {
    await this.db.insert(consentRecords).values({
      subjectUserId: record.subjectId,
      purpose: record.purpose,
      granted: record.granted,
      policyVersion: record.policyVersion,
      ipHash: record.ipHash ?? null,
      createdAt: new Date(record.at),
    });
  }

  async latest(subjectId: string, purpose: ConsentPurpose): Promise<ConsentRecord | null> {
    const rows = await this.db
      .select()
      .from(consentRecords)
      .where(
        and(eq(consentRecords.subjectUserId, subjectId), eq(consentRecords.purpose, purpose)),
      )
      .orderBy(desc(consentRecords.createdAt))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      subjectId: r.subjectUserId,
      purpose: r.purpose as ConsentPurpose,
      granted: r.granted,
      policyVersion: r.policyVersion,
      at: r.createdAt.toISOString(),
      ipHash: r.ipHash ?? undefined,
    };
  }

  async listForSubject(subjectId: string): Promise<ConsentRecord[]> {
    const rows = await this.db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.subjectUserId, subjectId))
      .orderBy(desc(consentRecords.createdAt));
    return rows.map((r) => ({
      subjectId: r.subjectUserId,
      purpose: r.purpose as ConsentPurpose,
      granted: r.granted,
      policyVersion: r.policyVersion,
      at: r.createdAt.toISOString(),
      ipHash: r.ipHash ?? undefined,
    }));
  }
}
