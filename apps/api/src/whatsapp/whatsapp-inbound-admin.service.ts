import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { AdminAuditService } from '../authority/admin-audit.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { adminAuditLog, waInboundMessages, waThreadNotes, waThreadOutbound } from '../db/schema';
import { maskWaId, redactPreview } from './redact';
import { waHandleFor } from './wa-handle';
import { toE164 } from './whatsapp-inbound.service';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';
import { WhatsAppJourneyService } from './whatsapp-journey.service';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export type WindowState = 'open' | 'closing_soon' | 'closed';

export type InboundListFilters = {
  window?: 'open' | 'closed';
  autoReplied?: boolean;
  from?: Date;
  to?: Date;
  messageType?: string;
  cursor?: string;
  limit?: number;
};

export type InboundDetailFilters = {
  cursor?: string;
  limit?: number;
};

type CursorPayload = { t: string; i: string };

type ThreadRow = {
  wa_id: string;
  wa_handle: string | null;
  message_count: number | string;
  last_received_at: Date | string;
  last_id: string;
  window_expires_at: Date | string;
  latest_body: string | null;
  latest_message_type: string;
  latest_contact_name: string | null;
  auto_replied_24h: boolean;
};

const REPLY_MAX_CHARS = 4096;

export function encodeCursor(receivedAt: Date, id: string): string {
  const payload: CursorPayload = { t: receivedAt.toISOString(), i: id };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): CursorPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as CursorPayload;
    if (!parsed?.t || !parsed?.i) return null;
    if (Number.isNaN(Date.parse(parsed.t))) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function windowStateAt(expiresAt: Date, now: Date): WindowState {
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return 'closed';
  if (ms < TWO_HOURS_MS) return 'closing_soon';
  return 'open';
}

export function remainingMs(expiresAt: Date, now: Date): number {
  return Math.max(0, expiresAt.getTime() - now.getTime());
}

function clampLimit(raw?: number): number {
  if (raw == null || !Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(raw)));
}

function asRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

/**
 * EC-19 / EC-19a — read-only admin queries over wa_inbound_messages.
 * List returns opaque waHandle only (never raw waId).
 */
@Injectable()
export class WhatsAppInboundAdminService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AdminAuditService,
    private readonly cloud: WhatsAppCloudClient,
    private readonly journey: WhatsAppJourneyService,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  /** Lightweight inbox stats for the EC WhatsApp shell (no PII). */
  async inboxSummary(now: Date = new Date()) {
    const nowIso = now.toISOString();
    const result = await this.db.execute(sql`
      SELECT
        COUNT(*)::int AS message_count,
        COUNT(DISTINCT wa_id)::int AS thread_count,
        MAX(received_at) AS last_received_at,
        COUNT(*) FILTER (WHERE window_expires_at > ${nowIso}::timestamptz)::int AS open_message_count,
        COUNT(DISTINCT wa_id) FILTER (WHERE window_expires_at > ${nowIso}::timestamptz)::int AS open_thread_count
      FROM wa_inbound_messages
    `);
    const row = asRows<{
      message_count: number | string;
      thread_count: number | string;
      last_received_at: Date | string | null;
      open_message_count: number | string;
      open_thread_count: number | string;
    }>(result)[0];
    const last = row?.last_received_at ? new Date(row.last_received_at) : null;
    return {
      threadCount: Number(row?.thread_count ?? 0),
      messageCount: Number(row?.message_count ?? 0),
      openThreadCount: Number(row?.open_thread_count ?? 0),
      openMessageCount: Number(row?.open_message_count ?? 0),
      lastReceivedAt: last && !Number.isNaN(last.getTime()) ? last.toISOString() : null,
    };
  }

  async listThreads(filters: InboundListFilters, now: Date = new Date()) {
    const limit = clampLimit(filters.limit);
    const cursor = filters.cursor ? decodeCursor(filters.cursor) : null;
    const nowIso = now.toISOString();
    const secret = this.config.WA_HANDLE_SECRET;

    const whereParts: SQL[] = [sql`TRUE`];
    if (filters.window === 'open') {
      whereParts.push(sql`l.window_expires_at > ${nowIso}::timestamptz`);
    } else if (filters.window === 'closed') {
      whereParts.push(sql`l.window_expires_at <= ${nowIso}::timestamptz`);
    }
    if (filters.autoReplied === true) {
      whereParts.push(sql`c.auto_replied_24h = TRUE`);
    } else if (filters.autoReplied === false) {
      whereParts.push(sql`c.auto_replied_24h = FALSE`);
    }
    if (filters.from) {
      whereParts.push(sql`l.last_received_at >= ${filters.from.toISOString()}::timestamptz`);
    }
    if (filters.to) {
      whereParts.push(sql`l.last_received_at <= ${filters.to.toISOString()}::timestamptz`);
    }
    if (filters.messageType) {
      whereParts.push(sql`l.latest_message_type = ${filters.messageType}`);
    }
    if (cursor) {
      whereParts.push(
        sql`(l.last_received_at, l.last_id) < (${cursor.t}::timestamptz, ${cursor.i}::uuid)`,
      );
    }

    const whereSql = sql.join(whereParts, sql` AND `);

    const result = await this.db.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (wa_id)
          wa_id,
          wa_handle,
          id AS last_id,
          received_at AS last_received_at,
          window_expires_at,
          body AS latest_body,
          message_type AS latest_message_type,
          contact_name AS latest_contact_name
        FROM wa_inbound_messages
        ORDER BY wa_id, received_at DESC, id DESC
      ),
      counts AS (
        SELECT
          wa_id,
          COUNT(*)::int AS message_count,
          BOOL_OR(
            auto_replied_at IS NOT NULL
            AND auto_replied_at > ${nowIso}::timestamptz - interval '24 hours'
          ) AS auto_replied_24h
        FROM wa_inbound_messages
        GROUP BY wa_id
      )
      SELECT
        l.wa_id,
        l.wa_handle,
        c.message_count,
        l.last_received_at,
        l.last_id,
        l.window_expires_at,
        l.latest_body,
        l.latest_message_type,
        l.latest_contact_name,
        COALESCE(c.auto_replied_24h, false) AS auto_replied_24h
      FROM latest l
      JOIN counts c ON c.wa_id = l.wa_id
      WHERE ${whereSql}
      ORDER BY l.last_received_at DESC, l.last_id DESC
      LIMIT ${limit + 1}
    `);

    const list = asRows<ThreadRow>(result);
    const page = list.slice(0, limit);
    const hasMore = list.length > limit;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor(new Date(last.last_received_at), String(last.last_id))
        : null;

    return {
      items: page.map((r) => {
        const expires = new Date(r.window_expires_at);
        const waId = String(r.wa_id);
        // Prefer stored handle; recompute if backfill lag (never return waId).
        const waHandle = r.wa_handle?.trim() || waHandleFor(waId, secret);
        return {
          waIdMasked: maskWaId(waId),
          waHandle,
          contactName: r.latest_contact_name?.trim() || null,
          messageCount: Number(r.message_count),
          lastReceivedAt: new Date(r.last_received_at).toISOString(),
          windowExpiresAt: expires.toISOString(),
          windowState: windowStateAt(expires, now),
          windowRemainingMs: remainingMs(expires, now),
          autoRepliedLast24h: Boolean(r.auto_replied_24h),
          latestMessageType: String(r.latest_message_type),
          preview: redactPreview(r.latest_body),
        };
      }),
      nextCursor,
    };
  }

  /**
   * Resolve opaque handle → wa_id. Unknown/tampered → 404 (do not echo input).
   * Does not log the resolution.
   */
  async resolveHandle(handle: string): Promise<string> {
    const trimmed = handle.trim();
    if (!trimmed) throw new NotFoundException('inbound thread not found');

    const byHandle = await this.db
      .select({ waId: waInboundMessages.waId })
      .from(waInboundMessages)
      .where(eq(waInboundMessages.waHandle, trimmed))
      .limit(1);
    if (byHandle[0]?.waId) return byHandle[0].waId;

    // Pre-backfill lag: match computed handle without logging wa_id.
    const distinct = asRows<{ wa_id: string }>(
      await this.db.execute(sql`SELECT DISTINCT wa_id FROM wa_inbound_messages`),
    );
    const secret = this.config.WA_HANDLE_SECRET;
    for (const row of distinct) {
      if (waHandleFor(String(row.wa_id), secret) === trimmed) return String(row.wa_id);
    }
    throw new NotFoundException('inbound thread not found');
  }

  /**
   * Detail reveal by opaque handle — audit first; on audit failure no bodies.
   */
  async listMessagesForHandle(
    handle: string,
    actorUserId: string,
    filters: InboundDetailFilters,
    now: Date = new Date(),
  ) {
    const waId = await this.resolveHandle(handle);
    return this.listMessagesForWaId(waId, actorUserId, filters, now, handle);
  }

  private async listMessagesForWaId(
    waId: string,
    actorUserId: string,
    filters: InboundDetailFilters,
    now: Date,
    handle: string,
  ) {
    const limit = clampLimit(filters.limit);
    const cursor = filters.cursor ? decodeCursor(filters.cursor) : null;

    const conditions = [eq(waInboundMessages.waId, waId)];
    if (cursor) {
      const t = new Date(cursor.t);
      conditions.push(
        sql`(${waInboundMessages.receivedAt}, ${waInboundMessages.id}) > (${t.toISOString()}::timestamptz, ${cursor.i}::uuid)`,
      );
    }

    const rows = await this.db
      .select({
        id: waInboundMessages.id,
        providerMessageId: waInboundMessages.providerMessageId,
        phoneNumberId: waInboundMessages.phoneNumberId,
        messageType: waInboundMessages.messageType,
        body: waInboundMessages.body,
        contactName: waInboundMessages.contactName,
        receivedAt: waInboundMessages.receivedAt,
        windowExpiresAt: waInboundMessages.windowExpiresAt,
        autoRepliedAt: waInboundMessages.autoRepliedAt,
        forwardedAt: waInboundMessages.forwardedAt,
        forwardError: waInboundMessages.forwardError,
        createdAt: waInboundMessages.createdAt,
      })
      .from(waInboundMessages)
      .where(and(...conditions))
      .orderBy(asc(waInboundMessages.receivedAt), asc(waInboundMessages.id))
      .limit(limit + 1);

    if (rows.length === 0 && !cursor) {
      throw new NotFoundException('inbound thread not found');
    }

    const page = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor(last.receivedAt, last.id) : null;

    const outbound = await this.db
      .select({
        id: waThreadOutbound.id,
        providerMessageId: waThreadOutbound.providerMessageId,
        body: waThreadOutbound.body,
        source: waThreadOutbound.source,
        actorUserId: waThreadOutbound.actorUserId,
        sentAt: waThreadOutbound.sentAt,
      })
      .from(waThreadOutbound)
      .where(eq(waThreadOutbound.waId, waId))
      .orderBy(asc(waThreadOutbound.sentAt), asc(waThreadOutbound.id));

    const windowRow = await this.db
      .select({
        windowExpiresAt: waInboundMessages.windowExpiresAt,
        contactName: waInboundMessages.contactName,
      })
      .from(waInboundMessages)
      .where(eq(waInboundMessages.waId, waId))
      .orderBy(desc(waInboundMessages.windowExpiresAt))
      .limit(1);
    const latestExpiry = windowRow[0]?.windowExpiresAt ?? new Date(0);
    const contactName =
      windowRow[0]?.contactName?.trim() ||
      page.map((r) => r.contactName?.trim()).find(Boolean) ||
      null;

    let auditId: string;
    try {
      const recorded = await this.audit.record({
        actorUserId,
        action: 'whatsapp_inbound_reveal',
        resourceType: 'wa_inbound_thread',
        resourceId: waId,
        reason: `revealed ${page.length} inbound + ${outbound.length} outbound`,
      });
      auditId = recorded.id;
    } catch {
      throw new InternalServerErrorException('audit write failed — reveal aborted');
    }

    const auditRows = await this.db
      .select({ id: adminAuditLog.id })
      .from(adminAuditLog)
      .where(eq(adminAuditLog.id, auditId))
      .limit(1);
    if (!auditRows.length) {
      throw new InternalServerErrorException('audit write failed — reveal aborted');
    }

    type TimelineItem = {
      direction: 'inbound' | 'outbound';
      id: string;
      at: string;
      messageType: string;
      body: string | null;
      providerMessageId: string | null;
      phoneNumberId: string | null;
      contactName: string | null;
      windowExpiresAt: string | null;
      autoRepliedAt: string | null;
      forwardedAt: string | null;
      forwardError: string | null;
      createdAt: string | null;
      source: 'auto_ack' | 'operator' | 'journey' | null;
      actorUserId: string | null;
    };

    const inboundItems: TimelineItem[] = page.map((r) => ({
      direction: 'inbound' as const,
      id: r.id,
      at: r.receivedAt.toISOString(),
      messageType: r.messageType,
      body: r.body,
      providerMessageId: r.providerMessageId,
      phoneNumberId: r.phoneNumberId,
      contactName: r.contactName,
      windowExpiresAt: r.windowExpiresAt.toISOString(),
      autoRepliedAt: r.autoRepliedAt?.toISOString() ?? null,
      forwardedAt: r.forwardedAt?.toISOString() ?? null,
      forwardError: r.forwardError,
      createdAt: r.createdAt.toISOString(),
      source: null,
      actorUserId: null,
    }));

    const outboundItems: TimelineItem[] = outbound.map((r) => ({
      direction: 'outbound' as const,
      id: r.id,
      at: r.sentAt.toISOString(),
      messageType: 'text',
      body: r.body,
      providerMessageId: r.providerMessageId,
      phoneNumberId: null,
      contactName: null,
      windowExpiresAt: null,
      autoRepliedAt: null,
      forwardedAt: null,
      forwardError: null,
      createdAt: null,
      source:
        r.source === 'operator'
          ? ('operator' as const)
          : r.source === 'journey'
            ? ('journey' as const)
            : ('auto_ack' as const),
      actorUserId: r.actorUserId,
    }));

    const items = [...inboundItems, ...outboundItems].sort((a, b) => {
      const dt = a.at.localeCompare(b.at);
      if (dt !== 0) return dt;
      return a.id.localeCompare(b.id);
    });

    const contact = await this.journey.getByWaId(waId);

    return {
      waHandle: handle,
      waId,
      waIdMasked: maskWaId(waId),
      waIdE164: toE164(waId),
      contactName,
      canReply: windowStateAt(latestExpiry, now) !== 'closed' && !contact?.blockedAt,
      windowState: windowStateAt(latestExpiry, now),
      windowExpiresAt: windowRow[0] ? latestExpiry.toISOString() : null,
      windowRemainingMs: windowRow[0] ? remainingMs(latestExpiry, now) : 0,
      language: contact?.language ?? null,
      contactType: contact?.contactType ?? 'lead',
      journeyStep: contact?.journeyStep ?? 'none',
      blocked: Boolean(contact?.blockedAt),
      crmContactId: contact?.crmContactId ?? null,
      matchedUserId: contact?.matchedUserId ?? null,
      auditId,
      messagesRevealed: page.length + outbound.length,
      items,
      /** @deprecated keep for older clients — same as items filtered to inbound */
      nextCursor,
    };
  }

  async listNotes(handle: string) {
    const waId = await this.resolveHandle(handle);
    const rows = await this.db
      .select()
      .from(waThreadNotes)
      .where(eq(waThreadNotes.waId, waId))
      .orderBy(desc(waThreadNotes.createdAt));
    return {
      items: rows.map((r) => ({
        id: r.id,
        body: r.body,
        actorUserId: r.actorUserId,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async addNote(handle: string, actorUserId: string, bodyRaw: string) {
    const body = bodyRaw.trim();
    if (!body) throw new BadRequestException('note body required');
    const waId = await this.resolveHandle(handle);
    const [row] = await this.db
      .insert(waThreadNotes)
      .values({ waId, waHandle: handle, body, actorUserId })
      .returning();
    await this.audit.record({
      actorUserId,
      action: 'whatsapp_thread_note',
      resourceType: 'wa_inbound_thread',
      resourceId: waId,
      reason: `note ${row!.id}`,
    });
    return { id: row!.id, createdAt: row!.createdAt.toISOString() };
  }

  async setBlocked(handle: string, actorUserId: string, blocked: boolean) {
    const waId = await this.resolveHandle(handle);
    const blockedAt = await this.journey.setBlocked(waId, blocked);
    await this.audit.record({
      actorUserId,
      action: blocked ? 'whatsapp_thread_block' : 'whatsapp_thread_unblock',
      resourceType: 'wa_inbound_thread',
      resourceId: waId,
    });
    return { blocked: Boolean(blockedAt), blockedAt: blockedAt?.toISOString() ?? null };
  }

  /**
   * EC-20 — operator free-form reply inside an open customer-service window.
   */
  async replyToHandle(
    handle: string,
    actorUserId: string,
    bodyRaw: string,
    now: Date = new Date(),
  ) {
    const body = bodyRaw.trim();
    if (!body) throw new BadRequestException('message body required');
    if (body.length > REPLY_MAX_CHARS) {
      throw new BadRequestException(`message body exceeds ${REPLY_MAX_CHARS} characters`);
    }

    const waId = await this.resolveHandle(handle);
    const windowRow = await this.db
      .select({ windowExpiresAt: waInboundMessages.windowExpiresAt })
      .from(waInboundMessages)
      .where(eq(waInboundMessages.waId, waId))
      .orderBy(desc(waInboundMessages.windowExpiresAt))
      .limit(1);
    const expires = windowRow[0]?.windowExpiresAt;
    if (!expires || windowStateAt(expires, now) === 'closed') {
      throw new BadRequestException('customer service window is closed — free-form reply not allowed');
    }
    const contact = await this.journey.getByWaId(waId);
    if (contact?.blockedAt) {
      throw new BadRequestException('contact is blocked');
    }

    const send = await this.cloud.sendText(toE164(waId), body);
    if (!send.ok) {
      throw new BadRequestException(`whatsapp send failed (${send.reason})`);
    }

    const sentAt = new Date();
    const inserted = await this.db
      .insert(waThreadOutbound)
      .values({
        waId,
        waHandle: handle,
        providerMessageId: send.messageId,
        body,
        source: 'operator',
        actorUserId,
        sentAt,
      })
      .returning({ id: waThreadOutbound.id });

    await this.audit.record({
      actorUserId,
      action: 'whatsapp_inbound_reply',
      resourceType: 'wa_inbound_thread',
      resourceId: waId,
      reason: `operator reply ${inserted[0]?.id ?? 'unknown'}`,
    });

    return {
      id: inserted[0]!.id,
      providerMessageId: send.messageId,
      sentAt: sentAt.toISOString(),
      windowExpiresAt: expires.toISOString(),
      windowState: windowStateAt(expires, now),
      windowRemainingMs: remainingMs(expires, now),
    };
  }
}
