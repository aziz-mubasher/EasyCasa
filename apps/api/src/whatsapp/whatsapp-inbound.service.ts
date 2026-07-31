import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, gt, isNotNull } from 'drizzle-orm';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { waInboundMessages } from '../db/schema';
import { EmailService } from '../email/email.service';
import {
  whatsappAutoReplySent,
  whatsappAutoReplySuppressed,
  whatsappInboundDuplicate,
  whatsappInboundForwardFailed,
  whatsappInboundReceived,
} from '../observability/metrics';
import { waHandleFor } from './wa-handle';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';

const WINDOW_MS = 24 * 60 * 60 * 1000;

const STOP_WORDS = new Set(['STOP', 'BASTA', 'CANCELLA', 'UNSUBSCRIBE', 'BAJA']);

export const AUTO_REPLY_TEXT =
  'Abbiamo ricevuto il tuo messaggio. Ti risponderemo via email (non su WhatsApp).\n' +
  "We've received your message — we'll reply by email.";

export type ParsedInboundMessage = {
  providerMessageId: string;
  waId: string;
  phoneNumberId: string;
  messageType: string;
  body: string | null;
  receivedAt: Date;
  windowExpiresAt: Date;
};

/**
 * EC-17 — persist inbound WhatsApp messages, one auto-ack per wa_id / 24h, ops email.
 * Logs internal row id only — never wa_id or body.
 */
@Injectable()
export class WhatsAppInboundService {
  private readonly log = new Logger(WhatsAppInboundService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly cloud: WhatsAppCloudClient,
    private readonly email: EmailService,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  /** Insert new messages; return internal ids that need post-response handling. */
  async persistNewMessages(payload: unknown): Promise<string[]> {
    const parsed = extractInboundMessages(payload);
    const newIds: string[] = [];
    for (const msg of parsed) {
      const inserted = await this.db
        .insert(waInboundMessages)
        .values({
          providerMessageId: msg.providerMessageId,
          waId: msg.waId,
          waHandle: waHandleFor(msg.waId, this.config.WA_HANDLE_SECRET),
          phoneNumberId: msg.phoneNumberId,
          messageType: msg.messageType,
          body: msg.body,
          receivedAt: msg.receivedAt,
          windowExpiresAt: msg.windowExpiresAt,
        })
        .onConflictDoNothing()
        .returning({ id: waInboundMessages.id });

      if (!inserted.length) {
        whatsappInboundDuplicate.inc();
        continue;
      }
      whatsappInboundReceived.inc();
      newIds.push(inserted[0]!.id);
    }
    return newIds;
  }

  /** After 200 — auto-reply + ops forward. Failures must not throw to Meta. */
  async handleAfterPersist(ids: string[]): Promise<void> {
    for (const id of ids) {
      try {
        await this.processOne(id);
      } catch (err) {
        this.log.warn(`inbound post-process failed id=${id}: ${String(err)}`);
      }
    }
  }

  private async processOne(id: string): Promise<void> {
    const rows = await this.db
      .select()
      .from(waInboundMessages)
      .where(eq(waInboundMessages.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return;

    await this.maybeAutoReply(row);
    await this.forwardToOps(row);
  }

  private async maybeAutoReply(row: typeof waInboundMessages.$inferSelect): Promise<void> {
    if (isStopWord(row.body)) {
      whatsappAutoReplySuppressed.inc({ reason: 'stop_word' });
      return;
    }
    if (row.windowExpiresAt.getTime() <= Date.now()) {
      whatsappAutoReplySuppressed.inc({ reason: 'window_closed' });
      return;
    }

    const recent = await this.db
      .select({ id: waInboundMessages.id })
      .from(waInboundMessages)
      .where(
        and(
          eq(waInboundMessages.waId, row.waId),
          isNotNull(waInboundMessages.autoRepliedAt),
          gt(waInboundMessages.autoRepliedAt, new Date(Date.now() - WINDOW_MS)),
        ),
      )
      .limit(1);
    if (recent.length) {
      whatsappAutoReplySuppressed.inc({ reason: 'already_replied' });
      return;
    }

    const send = await this.cloud.sendText(toE164(row.waId), AUTO_REPLY_TEXT);
    if (!send.ok) {
      whatsappAutoReplySuppressed.inc({ reason: 'send_failed' });
      this.log.warn(`auto-reply send failed id=${row.id} reason=${send.reason}`);
      return;
    }

    await this.db
      .update(waInboundMessages)
      .set({ autoRepliedAt: new Date() })
      .where(eq(waInboundMessages.id, row.id));
    whatsappAutoReplySent.inc();
    this.log.log(`auto-reply sent id=${row.id}`);
  }

  private async forwardToOps(row: typeof waInboundMessages.$inferSelect): Promise<void> {
    const to = this.config.WHATSAPP_INBOUND_OPS_EMAIL.trim() || this.config.AGENCY_PUBLIC_EMAIL;
    const adminBase = this.config.ADMIN_PUBLIC_URL.replace(/\/$/, '');
    const adminLink = `${adminBase}/#whatsapp`;

    // EC-19: default off — subject-line alert only (no bodies). Legacy body forward behind flag.
    const bodyForward = this.config.WA_INBOUND_EMAIL_FORWARD === true;
    const subject = bodyForward
      ? `[WhatsApp inbound] ${row.messageType}`
      : '1 new inbound WhatsApp message';
    const text = bodyForward
      ? [
          `Internal id: ${row.id}`,
          `wa_id: ${row.waId}`,
          `type: ${row.messageType}`,
          `received_at: ${row.receivedAt.toISOString()}`,
          `window_expires_at: ${row.windowExpiresAt.toISOString()}`,
          '',
          row.body ?? '(no text body — media or non-text)',
        ].join('\n')
      : [
          'New inbound WhatsApp message received.',
          `Open the audited viewer: ${adminLink}`,
          `(internal id ${row.id} — no message body in this alert)`,
        ].join('\n');

    try {
      const result = await this.email.sendText(to, subject, text);
      if (!result.delivered) {
        throw new Error(`email not delivered (provider=${result.provider})`);
      }
      await this.db
        .update(waInboundMessages)
        .set({ forwardedAt: new Date(), forwardError: null })
        .where(eq(waInboundMessages.id, row.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      whatsappInboundForwardFailed.inc();
      await this.db
        .update(waInboundMessages)
        .set({ forwardError: message.slice(0, 500) })
        .where(eq(waInboundMessages.id, row.id));
      this.log.warn(`ops forward failed id=${row.id}`);
    }
  }
}

export function isStopWord(body: string | null | undefined): boolean {
  if (body == null) return false;
  const normalized = body.trim().toUpperCase();
  return STOP_WORDS.has(normalized);
}

export function toE164(waId: string): string {
  const digits = waId.replace(/^\+/, '').trim();
  return digits.startsWith('+') ? digits : `+${digits}`;
}

/** Digits-only + E.164 variants for matching users.phone ↔ Meta wa_id. */
export function phoneMatchVariants(waIdOrPhone: string): string[] {
  const digits = waIdOrPhone.replace(/\D/g, '');
  if (!digits) return [];
  return [...new Set([digits, `+${digits}`, waIdOrPhone.trim()])];
}

export function extractInboundMessages(payload: unknown): ParsedInboundMessage[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string };
          messages?: Array<{
            id?: string;
            from?: string;
            timestamp?: string;
            type?: string;
            text?: { body?: string };
          }>;
        };
      }>;
    }>;
  };

  const out: ParsedInboundMessage[] = [];
  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id?.trim() || 'unknown';
      for (const message of value?.messages ?? []) {
        const providerMessageId = message.id?.trim();
        const waId = message.from?.trim();
        if (!providerMessageId || !waId) continue;

        const messageType = (message.type || 'unknown').trim() || 'unknown';
        const isText = messageType === 'text';
        const body = isText ? (message.text?.body ?? '').trim() || null : null;

        const tsSec = Number(message.timestamp);
        const receivedAt = Number.isFinite(tsSec) && tsSec > 0 ? new Date(tsSec * 1000) : new Date();
        const windowExpiresAt = new Date(receivedAt.getTime() + WINDOW_MS);

        out.push({
          providerMessageId,
          waId,
          phoneNumberId,
          messageType,
          body,
          receivedAt,
          windowExpiresAt,
        });
      }
    }
  }
  return out;
}
