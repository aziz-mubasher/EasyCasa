import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { users, waCallRequests, waContacts, waInboundMessages, waIntakeLeads, waThreadNotes, waThreadOutbound } from '../../db/schema';
import { toWaId } from '../../whatsapp/phone';
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
    return storedPhoneToWaId(rows[0]?.phoneE164 ?? null);
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
        originalBody: waThreadOutbound.originalBody,
        machineTranslated: waThreadOutbound.machineTranslated,
        templateName: waThreadOutbound.templateName,
        source: waThreadOutbound.source,
        sentAt: waThreadOutbound.sentAt,
      })
      .from(waThreadOutbound)
      .where(eq(waThreadOutbound.waId, waId))
      .orderBy(waThreadOutbound.sentAt);

    const leads = await this.db
      .select()
      .from(waIntakeLeads)
      .where(eq(waIntakeLeads.waId, waId))
      .orderBy(waIntakeLeads.createdAt);
    const calls = leads.length
      ? await this.db
          .select()
          .from(waCallRequests)
          .where(eq(waCallRequests.leadId, leads[0]!.id))
          .orderBy(waCallRequests.createdAt)
      : [];

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
          original_body: r.originalBody,
          machine_translated: r.machineTranslated,
          template_name: r.templateName,
        })),
        ...leads.map((r) => ({
          direction: 'intake',
          id: r.id,
          route: r.route,
          locale: r.locale,
          status: r.status,
          answers: r.answers,
          summary: r.summary,
        })),
        ...calls.map((r) => ({
          direction: 'call_request',
          id: r.id,
          status: r.status,
          customer_preference: r.customerPreference,
          call_language: r.callLanguage,
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
    const deletedNotes = await this.db
      .delete(waThreadNotes)
      .where(eq(waThreadNotes.waId, waId))
      .returning({ id: waThreadNotes.id });
    const deletedContacts = await this.db
      .delete(waContacts)
      .where(eq(waContacts.waId, waId))
      .returning({ waId: waContacts.waId });
    const deletedIn = await this.db
      .delete(waInboundMessages)
      .where(eq(waInboundMessages.waId, waId))
      .returning({ id: waInboundMessages.id });
    const deletedCalls = await this.db
      .delete(waCallRequests)
      .where(sql`${waCallRequests.leadId} in (select id from wa_intake_leads where wa_id = ${waId})`)
      .returning({ id: waCallRequests.id });
    const deletedLeads = await this.db
      .delete(waIntakeLeads)
      .where(eq(waIntakeLeads.waId, waId))
      .returning({ id: waIntakeLeads.id });
    return {
      source: this.source,
      erased:
        deletedIn.length +
        deletedOut.length +
        deletedNotes.length +
        deletedContacts.length +
        deletedCalls.length +
        deletedLeads.length,
      retainedUnderLegalHold: 0,
    };
  }
}

/**
 * users.phone_e164 is written by phone-verify as toWaId() output (digits, no '+').
 * A raw landline still has the trunk zero (`02…`). Always pass through toWaId.
 * Do not fold this into normalizePhoneE164.
 */
export function storedPhoneToWaId(phoneE164: string | null | undefined): string | null {
  if (!phoneE164) return null;
  const trimmed = phoneE164.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('+') || trimmed.startsWith('00') || trimmed.startsWith('0')) {
    return toWaId(trimmed);
  }
  return toWaId(`+${trimmed}`);
}
