import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { whatsappMessages } from '../../db/schema';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../personal-data-source';

/** EC-16 — null to_user_id on erasure; keep delivery stats. */
@Injectable()
export class WhatsAppMessagesDataSource implements PersonalDataSource {
  readonly source = 'whatsapp_messages';

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async collect(subjectId: string): Promise<CollectedData> {
    const rows = await this.db
      .select({
        id: whatsappMessages.id,
        templateName: whatsappMessages.templateName,
        status: whatsappMessages.status,
        relatedType: whatsappMessages.relatedType,
        relatedId: whatsappMessages.relatedId,
        sentAt: whatsappMessages.sentAt,
      })
      .from(whatsappMessages)
      .where(eq(whatsappMessages.toUserId, subjectId));
    return {
      source: this.source,
      records: rows.map((r) => ({
        id: r.id,
        templateName: r.templateName,
        status: r.status,
        relatedType: r.relatedType,
        relatedId: r.relatedId,
        sentAt: r.sentAt.toISOString(),
      })),
    };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    const updated = await this.db
      .update(whatsappMessages)
      .set({ toUserId: null })
      .where(eq(whatsappMessages.toUserId, subjectId))
      .returning({ id: whatsappMessages.id });
    return {
      source: this.source,
      erased: updated.length,
      retainedUnderLegalHold: updated.length,
      note: 'to_user_id nulled; delivery status rows retained for ops metrics',
    };
  }
}
