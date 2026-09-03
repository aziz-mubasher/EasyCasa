import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { waInboundMessages } from '../db/schema';
import { EmailService } from '../email/email.service';
import {
  whatsappAutoReplySuppressed,
  whatsappInboundDuplicate,
  whatsappInboundForwardFailed,
  whatsappInboundReceived,
} from '../observability/metrics';
import { waHandleFor } from './wa-handle';
import { WhatsAppJourneyService } from './whatsapp-journey.service';

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
  contactName: string | null;
  receivedAt: Date;
  windowExpiresAt: Date;
  /** Interactive list/button reply id (journey). */
  interactiveReplyId: string | null;
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
    private readonly email: EmailService,
    @InjectConfig() private readonly config: ApiConfig,
    private readonly journey: WhatsAppJourneyService,
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
          contactName: msg.contactName,
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

    if (isStopWord(row.body)) {
      whatsappAutoReplySuppressed.inc({ reason: 'stop_word' });
    } else if (row.windowExpiresAt.getTime() <= Date.now()) {
      whatsappAutoReplySuppressed.inc({ reason: 'window_closed' });
    } else {
      await this.journey.handleInboundRow(id);
    }
    await this.forwardToOps(row);
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
          contacts?: Array<{
            wa_id?: string;
            profile?: { name?: string };
          }>;
          messages?: Array<{
            id?: string;
            from?: string;
            timestamp?: string;
            type?: string;
            text?: { body?: string };
            image?: { caption?: string; id?: string; mime_type?: string };
            audio?: { id?: string; mime_type?: string };
            video?: { caption?: string; id?: string; mime_type?: string };
            document?: { caption?: string; filename?: string; id?: string; mime_type?: string };
            location?: { latitude?: number; longitude?: number; name?: string; address?: string };
            interactive?: {
              type?: string;
              button_reply?: { id?: string; title?: string };
              list_reply?: { id?: string; title?: string };
            };
            button?: { text?: string; payload?: string };
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
      const nameByWaId = new Map<string, string>();
      for (const c of value?.contacts ?? []) {
        const id = c.wa_id?.trim();
        const name = c.profile?.name?.trim();
        if (id && name) nameByWaId.set(id, name);
      }
      for (const message of value?.messages ?? []) {
        const providerMessageId = message.id?.trim();
        const waId = message.from?.trim();
        if (!providerMessageId || !waId) continue;

        const messageType = (message.type || 'unknown').trim() || 'unknown';
        const body = extractMessageBody(messageType, message);
        const interactiveReplyId = extractInteractiveReplyId(message);

        const tsSec = Number(message.timestamp);
        const receivedAt = Number.isFinite(tsSec) && tsSec > 0 ? new Date(tsSec * 1000) : new Date();
        const windowExpiresAt = new Date(receivedAt.getTime() + WINDOW_MS);

        out.push({
          providerMessageId,
          waId,
          phoneNumberId,
          messageType,
          body,
          contactName: nameByWaId.get(waId) ?? null,
          receivedAt,
          windowExpiresAt,
          interactiveReplyId,
        });
      }
    }
  }
  return out;
}

function extractMessageBody(
  messageType: string,
  message: {
    text?: { body?: string };
    image?: { caption?: string; id?: string; mime_type?: string };
    audio?: { id?: string; mime_type?: string };
    video?: { caption?: string; id?: string; mime_type?: string };
    document?: { caption?: string; filename?: string; id?: string; mime_type?: string };
    location?: { latitude?: number; longitude?: number; name?: string; address?: string };
    button?: { text?: string; payload?: string };
    interactive?: {
      type?: string;
      button_reply?: { id?: string; title?: string };
      list_reply?: { id?: string; title?: string };
    };
  },
): string | null {
  if (messageType === 'text') {
    return (message.text?.body ?? '').trim() || null;
  }
  if (messageType === 'image') {
    const caption = message.image?.caption?.trim();
    const mediaId = message.image?.id?.trim();
    const parts = [
      caption ? `caption: ${caption}` : null,
      mediaId ? `media_id: ${mediaId}` : null,
      message.image?.mime_type ? `mime: ${message.image.mime_type}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  }
  if (messageType === 'audio') {
    const parts = [
      message.audio?.id ? `media_id: ${message.audio.id}` : null,
      message.audio?.mime_type ? `mime: ${message.audio.mime_type}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  }
  if (messageType === 'video') {
    const parts = [
      message.video?.caption?.trim() ? `caption: ${message.video.caption.trim()}` : null,
      message.video?.id ? `media_id: ${message.video.id}` : null,
      message.video?.mime_type ? `mime: ${message.video.mime_type}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  }
  if (messageType === 'document') {
    const parts = [
      message.document?.filename?.trim() ? `file: ${message.document.filename.trim()}` : null,
      message.document?.caption?.trim() ? `caption: ${message.document.caption.trim()}` : null,
      message.document?.id ? `media_id: ${message.document.id}` : null,
      message.document?.mime_type ? `mime: ${message.document.mime_type}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  }
  if (messageType === 'location') {
    const loc = message.location;
    if (!loc) return null;
    const parts = [
      loc.name?.trim() || null,
      loc.address?.trim() || null,
      loc.latitude != null && loc.longitude != null
        ? `${loc.latitude},${loc.longitude}`
        : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  }
  if (messageType === 'button') {
    const text = message.button?.text?.trim();
    const payload = message.button?.payload?.trim();
    const parts = [text ? `button: ${text}` : null, payload ? `payload: ${payload}` : null].filter(
      Boolean,
    );
    return parts.length ? parts.join(' · ') : null;
  }
  if (messageType === 'interactive') {
    const reply = message.interactive?.button_reply ?? message.interactive?.list_reply;
    const title = reply?.title?.trim();
    const id = reply?.id?.trim();
    const parts = [title ? `reply: ${title}` : null, id ? `id: ${id}` : null].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  }
  return null;
}

export function extractInteractiveReplyId(message: {
  type?: string;
  button?: { payload?: string };
  interactive?: {
    button_reply?: { id?: string };
    list_reply?: { id?: string };
  };
}): string | null {
  const fromInteractive =
    message.interactive?.button_reply?.id?.trim() ||
    message.interactive?.list_reply?.id?.trim() ||
    null;
  if (fromInteractive) return fromInteractive;
  if (message.type === 'button') {
    return message.button?.payload?.trim() || null;
  }
  return null;
}
