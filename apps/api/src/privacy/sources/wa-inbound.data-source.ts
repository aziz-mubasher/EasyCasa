import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { users, waInboundMessages, waThreadOutbound } from '../../db/schema';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../personal-data-source';

/**
 * EC-17 / EC-19b / EC WhatsApp — DSAR/erasure for inbound + outbound thread
 * rows, keyed via users.phone_e164 ↔ wa_id (Meta digits, no '+').
 */
@Injectable()
export class WaInboundDataSource implements PersonalDataSource {
  readonly source = 'wa_inbound_messages';

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private async waIdForSubject(subjectId: string): Promise<string | null> {
    const rows = await this.db
      .select({ phoneE164: users.phoneE164 })
      .from(users)
      .where(eq(users.id, subjectId))
      .limit(1);
    return rows[0]?.phoneE164 ?? null;
  }

  async collect(subjectId: string): Promise<CollectedData> {
    const waId = await this.waIdForSubject(subjectId);
    if (!waId) return { source: this.source, records: [] };

    const inbound = await this.db
      .select({
        providerMessageId: waInboundMessages.providerMessageId,
        messageType: waInboundMessages.messageType,
        body: waInboundMessages.body,
        contactName: waInboundMessages.contactName,
        receivedAt: waInboundMessages.receivedAt,
        autoRepliedAt: waInboundMessages.autoRepliedAt,
      })
      .from(waInboundMessages)
      .where(eq(waInboundMessages.waId, waId))
      .orderBy(waInboundMessages.receivedAt);

    const outbound = await this.db
      .select({
        providerMessageId: waThreadOutbound.providerMessageId,
        body: waThreadOutbound.body,
        source: waThreadOutbound.source,
        sentAt: waThreadOutbound.sentAt,
      })
      .from(waThreadOutbound)
      .where(eq(waThreadOutbound.waId, waId))
      .orderBy(waThreadOutbound.sentAt);

    return {
      source: this.source,
      records: [
        ...inbound.map((r) => ({
          direction: 'inbound',
          provider_message_id: r.providerMessageId,
          message_type: r.messageType,
          body: r.body,
          contact_name: r.contactName,
          received_at: r.receivedAt.toISOString(),
          auto_replied_at: r.autoRepliedAt?.toISOString() ?? null,
        })),
        ...outbound.map((r) => ({
          direction: 'outbound',
          provider_message_id: r.providerMessageId,
          body: r.body,
          source: r.source,
          sent_at: r.sentAt.toISOString(),
        })),
      ],
    };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    const waId = await this.waIdForSubject(subjectId);
    if (!waId) {
      return { source: this.source, erased: 0, retainedUnderLegalHold: 0 };
    }
    const deletedOut = await this.db
      .delete(waThreadOutbound)
      .where(eq(waThreadOutbound.waId, waId))
      .returning({ id: waThreadOutbound.id });
    const deletedIn = await this.db
      .delete(waInboundMessages)
      .where(eq(waInboundMessages.waId, waId))
      .returning({ id: waInboundMessages.id });
    return {
      source: this.source,
      erased: deletedIn.length + deletedOut.length,
      retainedUnderLegalHold: 0,
    };
  }
}
