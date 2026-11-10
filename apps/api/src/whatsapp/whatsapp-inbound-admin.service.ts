import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { AdminAuditService } from '../authority/admin-audit.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { adminAuditLog, waCallRequests, waContacts, waInboundMessages, waIntakeLeads, waThreadNotes, waThreadOutbound } from '../db/schema';
import templateCorpus from './intake/EC_WA_templates_v1.json';
import { approvedLanguageCodes, assertCallShape, chooseTemplateLocale, closePatch, slotProblem } from './intake/rules';
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
  private readonly log = new Logger(WhatsAppInboundAdminService.name);

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
      source: 'auto_ack' | 'operator' | 'journey' | 'intake' | null;
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
            : r.source === 'intake'
              ? ('intake' as const)
              : ('auto_ack' as const),
      actorUserId: r.actorUserId,
    }));

    const items = [...inboundItems, ...outboundItems].sort((a, b) => {
      const dt = a.at.localeCompare(b.at);
      if (dt !== 0) return dt;
      return a.id.localeCompare(b.id);
    });

    const contact = await this.journey.getByWaId(waId);
    const crmFullName = await this.journey.crmFormName(waId);
    const intake = await this.latestIntake(waId);

    return {
      waHandle: handle,
      waId,
      waIdMasked: maskWaId(waId),
      waIdE164: toE164(waId),
      contactName,
      crmFullName,
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
      intake,
      auditId,
      messagesRevealed: page.length + outbound.length,
      items,
      /** @deprecated keep for older clients — same as items filtered to inbound */
      nextCursor,
    };
  }

  /** Null when migration 0077 has not been applied yet, so the existing viewer still opens. */
  private async latestIntake(waId: string) {
    try {
      const intakeRows = await this.db
        .select()
        .from(waIntakeLeads)
        .where(eq(waIntakeLeads.waId, waId))
        .orderBy(desc(waIntakeLeads.createdAt))
        .limit(1);
      const row = intakeRows[0];
      if (!row) return null;
      return {
        id: row.id,
        route: row.route,
        locale: row.locale,
        status: row.intakeStatus,
        pipelineStatus: row.status,
        ownerUserId: row.ownerUserId,
        crmContactId: row.crmContactId,
        product: row.product,
        contactPref: row.contactPref,
        bookingStatus: row.bookingStatus,
        answers: row.answers,
        media: row.media,
        summary: row.summary,
        summaryStatus: row.summaryStatus,
        disclosureSentAt: row.disclosureSentAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (!message.includes('wa_intake_leads')) throw err;
      this.log.warn('intake lookup skipped: wa_intake_leads is not migrated');
      return null;
    }
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
    translation?: { originalBody?: string; machineTranslated?: boolean },
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
        originalBody: translation?.originalBody ?? null,
        machineTranslated: Boolean(translation?.machineTranslated),
        source: 'operator',
        actorUserId,
        sentAt,
        windowOpen: true,
      })
      .returning({ id: waThreadOutbound.id });

    if (this.config.WA_CONSULTANT_REPLY_ENABLED) {
      await this.db
        .update(waContacts)
        .set({ consultantRepliedAt: sentAt, updatedAt: sentAt })
        .where(eq(waContacts.waId, waId));
      await this.db
        .update(waIntakeLeads)
        .set({ status: 'contacted', contactedAt: sentAt, updatedAt: sentAt })
        .where(and(eq(waIntakeLeads.waId, waId), sql`${waIntakeLeads.status} in ('new', 'assigned')`));
    }

    await this.audit.record({
      actorUserId,
      action: 'whatsapp_inbound_reply',
      resourceType: 'wa_inbound_thread',
      resourceId: waId,
      reason: `operator reply ${inserted[0]?.id ?? 'unknown'} window=open free_text`,
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

  /** EC-WA-INTAKE-2 — lead list for #whatsapp/leads. Link only; no message bodies. */
  async listLeads(filter: { status?: string; ownerUserId?: string; product?: string }) {
    const rows = await this.db
      .select()
      .from(waIntakeLeads)
      .orderBy(desc(waIntakeLeads.createdAt))
      .limit(200);
    const filtered = rows.filter((row) => {
      if (filter.status && row.status !== filter.status) return false;
      if (filter.ownerUserId && row.ownerUserId !== filter.ownerUserId) return false;
      if (filter.product && row.product !== filter.product) return false;
      return true;
    });
    const now = new Date();
    return {
      items: await Promise.all(
        filtered.map(async (row) => {
          const [contact] = await this.db
            .select({ lastInboundAt: waContacts.lastInboundAt })
            .from(waContacts)
            .where(eq(waContacts.waId, row.waId))
            .limit(1);
          const [call] = await this.db
            .select({ status: waCallRequests.status })
            .from(waCallRequests)
            .where(eq(waCallRequests.leadId, row.id))
            .orderBy(desc(waCallRequests.createdAt))
            .limit(1);
          const expires = contact?.lastInboundAt
            ? new Date(contact.lastInboundAt.getTime() + 24 * 60 * 60 * 1000)
            : null;
          return {
            id: row.id,
            status: row.status,
            ownerUserId: row.ownerUserId,
            product: row.product,
            route: row.route,
            locale: row.locale,
            createdAt: row.createdAt.toISOString(),
            windowRemainingMs: expires ? Math.max(0, expires.getTime() - now.getTime()) : null,
            callStatus: call?.status ?? null,
            crmContactId: row.crmContactId,
          };
        }),
      ),
    };
  }

  async getLead(id: string) {
    const [row] = await this.db.select().from(waIntakeLeads).where(eq(waIntakeLeads.id, id)).limit(1);
    if (!row) throw new NotFoundException('Lead not found');
    const calls = await this.db
      .select()
      .from(waCallRequests)
      .where(eq(waCallRequests.leadId, row.id))
      .orderBy(desc(waCallRequests.createdAt));
    const [contact] = await this.db
      .select({ lastInboundAt: waContacts.lastInboundAt })
      .from(waContacts)
      .where(eq(waContacts.waId, row.waId))
      .limit(1);
    const now = new Date();
    const expires = contact?.lastInboundAt
      ? new Date(contact.lastInboundAt.getTime() + 24 * 60 * 60 * 1000)
      : null;
    return {
      id: row.id,
      status: row.status,
      intakeStatus: row.intakeStatus,
      ownerUserId: row.ownerUserId,
      product: row.product,
      route: row.route,
      locale: row.locale,
      contactPref: row.contactPref,
      answers: row.answers,
      summary: row.summary,
      createdAt: row.createdAt.toISOString(),
      windowOpen: expires ? now < expires : false,
      windowRemainingMs: expires ? Math.max(0, expires.getTime() - now.getTime()) : null,
      conversationHref: `#whatsapp/${waHandleFor(row.waId, this.config.WA_HANDLE_SECRET)}`,
      calls: calls.map((call) => ({
        id: call.id,
        status: call.status,
        customerPreference: call.customerPreference,
        requestedSlot: call.requestedSlot?.toISOString() ?? null,
        offeredSlot: call.offeredSlot?.toISOString() ?? null,
        durationMin: call.durationMin,
        callLanguage: call.callLanguage,
        reminderSentAt: call.reminderSentAt?.toISOString() ?? null,
      })),
    };
  }

  async assignLead(id: string, ownerUserId: string, actorUserId: string) {
    const now = new Date();
    const updated = await this.db
      .update(waIntakeLeads)
      .set({ status: 'assigned', ownerUserId, assignedAt: now, updatedAt: now })
      .where(and(eq(waIntakeLeads.id, id), sql`${waIntakeLeads.status} in ('new', 'assigned')`))
      .returning({ id: waIntakeLeads.id });
    if (!updated[0]) throw new BadRequestException('Lead cannot be assigned from its current status');
    await this.audit.record({
      actorUserId,
      action: 'whatsapp_lead_assign',
      resourceType: 'wa_intake_lead',
      resourceId: id,
      reason: `owner ${ownerUserId}`,
    });
    return { id, status: 'assigned', ownerUserId };
  }

  async closeLead(id: string, reason: string, actorUserId: string) {
    const patch = closePatch(reason);
    const now = new Date();
    const updated = await this.db
      .update(waIntakeLeads)
      .set({ status: 'closed', closedReason: patch.closedReason, closedAt: now, updatedAt: now })
      .where(eq(waIntakeLeads.id, id))
      .returning({ id: waIntakeLeads.id });
    if (!updated[0]) throw new NotFoundException('Lead not found');
    await this.audit.record({
      actorUserId,
      action: 'whatsapp_lead_close',
      resourceType: 'wa_intake_lead',
      resourceId: id,
      reason: patch.closedReason,
    });
    return { id, status: 'closed', closedReason: patch.closedReason };
  }

  /**
   * Confirm, offer, cancel, done, or no-show. Call templates are sent only when
   * that locale (or English) is in the approved set. An empty set refuses the send.
   */
  async decideCall(
    leadId: string,
    actorUserId: string,
    input: {
      action: 'confirm' | 'offer' | 'cancel' | 'done' | 'no_show';
      requestedSlot?: string;
      offeredSlot?: string;
      callLanguage?: string;
      approvedLocales?: string[];
    },
  ) {
    if (!this.config.WA_CALL_REQUESTS_ENABLED) throw new BadRequestException('call requests are off');
    const [lead] = await this.db.select().from(waIntakeLeads).where(eq(waIntakeLeads.id, leadId)).limit(1);
    if (!lead) throw new NotFoundException('Lead not found');
    const [call] = await this.db
      .select()
      .from(waCallRequests)
      .where(eq(waCallRequests.leadId, leadId))
      .orderBy(desc(waCallRequests.createdAt))
      .limit(1);
    if (!call) throw new NotFoundException('Call request not found');
    const staffed = this.config.STAFFED_CALL_LOCALES.split(',').map((item) => item.trim()).filter(Boolean);
    const language = input.callLanguage ?? call.callLanguage;
    try {
      assertCallShape(15, language, staffed);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'call shape rejected');
    }
    const now = new Date();
    if (input.action === 'cancel' || input.action === 'done' || input.action === 'no_show') {
      await this.db
        .update(waCallRequests)
        .set({ status: input.action === 'cancel' ? 'cancelled' : input.action, callLanguage: language, decidedBy: actorUserId, decidedAt: now, updatedAt: now })
        .where(eq(waCallRequests.id, call.id));
      if (input.action === 'done' && (lead.status === 'new' || lead.status === 'assigned')) {
        await this.db
          .update(waIntakeLeads)
          .set({ status: 'contacted', contactedAt: now, updatedAt: now })
          .where(eq(waIntakeLeads.id, lead.id));
      }
      await this.audit.record({
        actorUserId,
        action: 'whatsapp_call_decide',
        resourceType: 'wa_call_request',
        resourceId: call.id,
        reason: input.action,
      });
      return { status: input.action === 'cancel' ? 'cancelled' : input.action, sent: false };
    }
    const slotRaw = input.action === 'confirm' ? input.requestedSlot : input.offeredSlot;
    if (!slotRaw) throw new BadRequestException('slot required');
    const slot = new Date(slotRaw);
    const problem = slotProblem(slot, now, await this.ownerSlotStarts(lead.ownerUserId, call.id));
    if (problem) throw new BadRequestException(`slot rejected: ${problem}`);
    const templateName = input.action === 'confirm' ? 'ec_call_confirmed' : 'ec_call_not_possible';
    const approved = approvedLanguageCodes(await this.cloud.templateLanguageStatuses(templateName));
    const locale = chooseTemplateLocale(lead.locale, approved ?? []);
    if (!locale) throw new BadRequestException('template not approved in this language');
    const planned = call.requestedSlot ? formatRome(call.requestedSlot, locale) : (call.customerPreference ?? formatRome(slot, locale));
    const params = input.action === 'confirm'
      ? [formatRome(slot, locale), callLanguageName(locale, language)]
      : [planned, formatRome(slot, locale)];
    const send = await this.cloud.sendTemplate({
      phoneE164: `+${lead.waId}`,
      templateName,
      languageCode: metaLanguage(templateName, locale),
      bodyParams: params,
    });
    if (!send.ok) throw new BadRequestException(`whatsapp send failed (${send.reason})`);
    await this.db
      .update(waCallRequests)
      .set({
        status: input.action === 'confirm' ? 'confirmed' : 'offered_other',
        requestedSlot: input.action === 'confirm' ? slot : call.requestedSlot,
        offeredSlot: input.action === 'offer' ? slot : call.offeredSlot,
        callLanguage: language,
        decidedBy: actorUserId,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(waCallRequests.id, call.id));
    await this.db.insert(waThreadOutbound).values({
      waId: lead.waId,
      waHandle: waHandleFor(lead.waId, this.config.WA_HANDLE_SECRET),
      providerMessageId: send.messageId,
      body: params.join(' · '),
      templateName,
      windowOpen: false,
      source: 'operator',
      actorUserId,
    });
    await this.audit.record({
      actorUserId,
      action: 'whatsapp_call_decide',
      resourceType: 'wa_call_request',
      resourceId: call.id,
      reason: `${input.action} template=${templateName} locale=${locale}`,
    });
    return { status: input.action === 'confirm' ? 'confirmed' : 'offered_other', sent: true, locale };
  }

  private async ownerSlotStarts(ownerUserId: string | null, exceptCallId: string): Promise<Date[]> {
    if (!ownerUserId) return [];
    const leads = await this.db.select({ id: waIntakeLeads.id }).from(waIntakeLeads).where(eq(waIntakeLeads.ownerUserId, ownerUserId));
    const starts: Date[] = [];
    for (const lead of leads) {
      const calls = await this.db.select().from(waCallRequests).where(eq(waCallRequests.leadId, lead.id));
      for (const call of calls) {
        if (call.id === exceptCallId) continue;
        if (call.status !== 'confirmed' && call.status !== 'offered_other') continue;
        const start = call.status === 'offered_other' ? call.offeredSlot : call.requestedSlot;
        if (start) starts.push(start);
      }
    }
    return starts;
  }

  async leadIdForCrmContact(contactId: string): Promise<{ leadId: string | null }> {
    const [row] = await this.db
      .select({ id: waIntakeLeads.id })
      .from(waIntakeLeads)
      .where(eq(waIntakeLeads.crmContactId, contactId))
      .orderBy(desc(waIntakeLeads.createdAt))
      .limit(1);
    return { leadId: row?.id ?? null };
  }
}

function formatRome(slot: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(slot);
}

function callLanguageName(locale: string, callLanguage: string): string {
  const table = (templateCorpus.call_language_names as Record<string, Record<string, string>>)[locale];
  return table?.[callLanguage] ?? callLanguage;
}

function metaLanguage(templateName: string, locale: string): string {
  const templates = templateCorpus.templates as Record<string, Record<string, { meta_language: string }>>;
  return templates[templateName]?.[locale]?.meta_language ?? locale;
}
