import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { users, waInboundMessages } from '../../db/schema';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../personal-data-source';
import { phoneMatchVariants } from '../../whatsapp/whatsapp-inbound.service';

/**
 * EC-17 — DSAR/erasure for wa_inbound_messages, keyed via users.phone ↔ wa_id.
 */
@Injectable()
export class WaInboundDataSource implements PersonalDataSource {
  readonly source = 'wa_inbound_messages';

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private async waIdsForSubject(subjectId: string): Promise<string[]> {
    const rows = await this.db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, subjectId))
      .limit(1);
    const phone = rows[0]?.phone;
    if (!phone) return [];
    return phoneMatchVariants(phone);
  }

  async collect(subjectId: string): Promise<CollectedData> {
    const variants = await this.waIdsForSubject(subjectId);
    if (!variants.length) return { source: this.source, records: [] };

    const rows = await this.db
      .select({
        providerMessageId: waInboundMessages.providerMessageId,
        messageType: waInboundMessages.messageType,
        body: waInboundMessages.body,
        receivedAt: waInboundMessages.receivedAt,
        autoRepliedAt: waInboundMessages.autoRepliedAt,
      })
      .from(waInboundMessages)
      .where(inArray(waInboundMessages.waId, variants))
      .orderBy(waInboundMessages.receivedAt);

    return {
      source: this.source,
      records: rows.map((r) => ({
        provider_message_id: r.providerMessageId,
        message_type: r.messageType,
        body: r.body,
        received_at: r.receivedAt.toISOString(),
        auto_replied_at: r.autoRepliedAt?.toISOString() ?? null,
      })),
    };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    const variants = await this.waIdsForSubject(subjectId);
    if (!variants.length) {
      return { source: this.source, erased: 0, retainedUnderLegalHold: 0 };
    }
    const deleted = await this.db
      .delete(waInboundMessages)
      .where(inArray(waInboundMessages.waId, variants))
      .returning({ id: waInboundMessages.id });
    return {
      source: this.source,
      erased: deleted.length,
      retainedUnderLegalHold: 0,
    };
  }
}
