import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, sql, type SQL } from 'drizzle-orm';

import { AdminAuditService } from '../authority/admin-audit.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { adminAuditLog, waInboundMessages } from '../db/schema';
import { maskWaId, redactPreview } from './redact';

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
  message_count: number | string;
  last_received_at: Date | string;
  last_id: string;
  window_expires_at: Date | string;
  latest_body: string | null;
  latest_message_type: string;
  auto_replied_24h: boolean;
};

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
 * EC-19 — read-only admin queries over wa_inbound_messages.
 * No joins to users / enquiries / listings.
 */
@Injectable()
export class WhatsAppInboundAdminService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AdminAuditService,
  ) {}

  async listThreads(filters: InboundListFilters, now: Date = new Date()) {
    const limit = clampLimit(filters.limit);
    const cursor = filters.cursor ? decodeCursor(filters.cursor) : null;
    const nowIso = now.toISOString();

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
          id AS last_id,
          received_at AS last_received_at,
          window_expires_at,
          body AS latest_body,
          message_type AS latest_message_type
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
        c.message_count,
        l.last_received_at,
        l.last_id,
        l.window_expires_at,
        l.latest_body,
        l.latest_message_type,
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
        return {
          waIdMasked: maskWaId(String(r.wa_id)),
          /** Opaque key for detail route — not a join to users/enquiries/listings. */
          waId: String(r.wa_id),
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
   * Detail reveal — writes audit first; on audit failure the request fails
   * (no message bodies returned).
   */
  async listMessagesForWaId(
    waId: string,
    actorUserId: string,
    filters: InboundDetailFilters,
    now: Date = new Date(),
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
        messageType: waInboundMessages.messageType,
        body: waInboundMessages.body,
        receivedAt: waInboundMessages.receivedAt,
        windowExpiresAt: waInboundMessages.windowExpiresAt,
        autoRepliedAt: waInboundMessages.autoRepliedAt,
      })
      .from(waInboundMessages)
      .where(and(...conditions))
      .orderBy(asc(waInboundMessages.receivedAt), asc(waInboundMessages.id))
      .limit(limit + 1);

    if (rows.length === 0 && !cursor) {
      const any = await this.db
        .select({ id: waInboundMessages.id })
        .from(waInboundMessages)
        .where(eq(waInboundMessages.waId, waId))
        .limit(1);
      if (!any.length) throw new NotFoundException('inbound thread not found');
    }

    const page = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor(last.receivedAt, last.id) : null;

    let auditId: string;
    try {
      const recorded = await this.audit.record({
        actorUserId,
        action: 'whatsapp_inbound_reveal',
        resourceType: 'wa_inbound_thread',
        resourceId: waId,
        reason: `revealed ${page.length} message(s)`,
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

    const latestExpiry =
      page.length === 0
        ? new Date(0)
        : page.reduce(
            (max, r) => (r.windowExpiresAt > max ? r.windowExpiresAt : max),
            page[0]!.windowExpiresAt,
          );

    return {
      waId,
      waIdMasked: maskWaId(waId),
      windowState: page.length ? windowStateAt(latestExpiry, now) : 'closed',
      windowExpiresAt: page.length ? latestExpiry.toISOString() : null,
      windowRemainingMs: page.length ? remainingMs(latestExpiry, now) : 0,
      auditId,
      messagesRevealed: page.length,
      items: page.map((r) => ({
        id: r.id,
        messageType: r.messageType,
        body: r.body,
        receivedAt: r.receivedAt.toISOString(),
        windowExpiresAt: r.windowExpiresAt.toISOString(),
        autoRepliedAt: r.autoRepliedAt?.toISOString() ?? null,
      })),
      nextCursor,
    };
  }
}
