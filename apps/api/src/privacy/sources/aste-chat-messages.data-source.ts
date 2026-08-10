import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { asteAnalyses, asteChatMessages } from '../../db/schema';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../personal-data-source';

/**
 * EC-25 — user-tied chat transcripts (content exportable; cascades with analyses).
 */
@Injectable()
export class AsteChatMessagesDataSource implements PersonalDataSource {
  readonly source = 'aste_chat_messages';

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async collect(subjectId: string): Promise<CollectedData> {
    const analyses = await this.db
      .select({ id: asteAnalyses.id })
      .from(asteAnalyses)
      .where(eq(asteAnalyses.userId, subjectId));
    if (!analyses.length) return { source: this.source, records: [] };

    const ids = analyses.map((a) => a.id);
    const rows = await this.db
      .select()
      .from(asteChatMessages)
      .where(inArray(asteChatMessages.analysisId, ids));

    return {
      source: this.source,
      records: rows.map((r) => ({
        id: r.id,
        analysisId: r.analysisId,
        role: r.role,
        content: r.content,
        lang: r.lang,
        citations: r.citations,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    const analyses = await this.db
      .select({ id: asteAnalyses.id })
      .from(asteAnalyses)
      .where(eq(asteAnalyses.userId, subjectId));
    if (!analyses.length) {
      return { source: this.source, erased: 0, retainedUnderLegalHold: 0 };
    }
    const ids = analyses.map((a) => a.id);
    // Count then delete — analysis erasure also cascades; this covers chat-only wipe.
    const existing = await this.db
      .select({ id: asteChatMessages.id })
      .from(asteChatMessages)
      .where(inArray(asteChatMessages.analysisId, ids));
    if (existing.length) {
      await this.db
        .delete(asteChatMessages)
        .where(inArray(asteChatMessages.analysisId, ids));
    }
    return {
      source: this.source,
      erased: existing.length,
      retainedUnderLegalHold: 0,
      note: 'chat messages removed (also cascade on analysis erase)',
    };
  }
}
