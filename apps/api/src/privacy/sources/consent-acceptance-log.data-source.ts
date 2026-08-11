import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { consentAcceptanceLog } from '../../db/schema';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../personal-data-source';

/**
 * EC-S-T30 — DSAR section for seller informativa acceptance log.
 * Erasure retains rows as Art. 7 evidence (same pattern as consent_records).
 */
@Injectable()
export class ConsentAcceptanceLogDataSource implements PersonalDataSource {
  readonly source = 'consent_acceptance_log';

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async collect(subjectId: string): Promise<CollectedData> {
    const rows = await this.db
      .select({
        id: consentAcceptanceLog.id,
        policyVersion: consentAcceptanceLog.policyVersion,
        acceptedAt: consentAcceptanceLog.acceptedAt,
      })
      .from(consentAcceptanceLog)
      .where(eq(consentAcceptanceLog.userId, subjectId));
    return {
      source: this.source,
      records: rows.map((r) => ({
        id: r.id,
        policyVersion: r.policyVersion,
        acceptedAt: r.acceptedAt.toISOString(),
      })),
    };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    const rows = await this.db
      .select({ id: consentAcceptanceLog.id })
      .from(consentAcceptanceLog)
      .where(eq(consentAcceptanceLog.userId, subjectId));
    return {
      source: this.source,
      erased: 0,
      retainedUnderLegalHold: rows.length,
      note: 'consent acceptance log retained as Art. 7 evidence',
    };
  }
}
