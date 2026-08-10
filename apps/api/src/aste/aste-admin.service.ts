import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql, type SQL } from 'drizzle-orm';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { AdminAuditService } from '../authority/admin-audit.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import {
  asteAnalyses,
  asteChatMessages,
  asteDocuments,
  asteLeads,
  users,
} from '../db/schema';
import {
  failureReasonCategory,
  maskFilename,
  opaqueUserRef,
} from './aste-admin.mask';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
/** Align Failures tab stale filter with alert threshold (45 min). */
export const DEFAULT_STALE_PROCESSING_MS = 45 * 60 * 1000;

export type AsteAdminListFilters = {
  status?: string;
  failuresOnly?: boolean;
  staleMs?: number;
  cursor?: string;
  limit?: number;
};

type CursorPayload = { t: string; i: string };

function clampLimit(raw?: number): number {
  if (raw == null || !Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(raw)));
}

function encodeCursor(updatedAt: Date, id: string): string {
  const payload: CursorPayload = { t: updatedAt.toISOString(), i: id };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): CursorPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as CursorPayload;
    if (!parsed?.t || !parsed?.i) return null;
    if (Number.isNaN(Date.parse(parsed.t))) return null;
    return parsed;
  } catch {
    return null;
  }
}

function asRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

function iso(d: Date | string | null | undefined): string | null {
  if (d == null) return null;
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? null : x.toISOString();
}

/**
 * EC-26 — Aste ops admin queries. Masked by default; not gated by ASTE_ANALYSIS_ENABLED.
 * Never returns document text, extraction values, or chat content.
 */
@Injectable()
export class AsteAdminService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AdminAuditService,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  private userRef(userId: string): string {
    return opaqueUserRef(userId, this.config.WA_HANDLE_SECRET);
  }

  async list(filters: AsteAdminListFilters, now: Date = new Date()) {
    const limit = clampLimit(filters.limit);
    const cursor = filters.cursor ? decodeCursor(filters.cursor) : null;
    const staleMs = filters.staleMs ?? DEFAULT_STALE_PROCESSING_MS;
    const staleCutoff = new Date(now.getTime() - staleMs).toISOString();

    const whereParts: SQL[] = [sql`TRUE`];
    if (filters.failuresOnly) {
      whereParts.push(sql`(
        a.status = 'failed'
        OR (
          a.status = 'processing'
          AND a.processing_started_at IS NOT NULL
          AND a.processing_started_at < ${staleCutoff}::timestamptz
        )
      )`);
    } else if (filters.status) {
      whereParts.push(sql`a.status = ${filters.status}`);
    }
    if (cursor) {
      whereParts.push(
        sql`(a.updated_at, a.id) < (${cursor.t}::timestamptz, ${cursor.i}::uuid)`,
      );
    }
    const whereSql = sql.join(whereParts, sql` AND `);

    const result = await this.db.execute(sql`
      SELECT
        a.id,
        a.user_id,
        a.status,
        a.attempts,
        a.created_at,
        a.updated_at,
        a.processing_started_at,
        a.failure_reason,
        a.language,
        a.register,
        a.provincia
      FROM aste_analyses a
      WHERE ${whereSql}
      ORDER BY a.updated_at DESC, a.id DESC
      LIMIT ${limit + 1}
    `);

    const rows = asRows<{
      id: string;
      user_id: string;
      status: string;
      attempts: number | string;
      created_at: Date | string;
      updated_at: Date | string;
      processing_started_at: Date | string | null;
      failure_reason: string | null;
      language: string;
      register: string;
      provincia: string | null;
    }>(result);

    const page = rows.slice(0, limit);
    const next = rows.length > limit ? rows[limit]! : null;

    return {
      items: page.map((r) => {
        const processingStartedAt = iso(r.processing_started_at);
        const updatedAt = iso(r.updated_at)!;
        const ageMs =
          r.status === 'processing' && processingStartedAt
            ? Math.max(0, now.getTime() - new Date(processingStartedAt).getTime())
            : null;
        return {
          id: r.id,
          userRef: this.userRef(r.user_id),
          status: r.status,
          attempts: Number(r.attempts),
          createdAt: iso(r.created_at),
          updatedAt,
          processingStartedAt,
          stageTimingSummary: {
            processingStartedAt,
            updatedAt,
            ageMs,
            attempts: Number(r.attempts),
          },
          failureReasonCategory: failureReasonCategory(r.failure_reason),
          language: r.language,
          register: r.register,
          provincia: r.provincia,
        };
      }),
      nextCursor: next ? encodeCursor(new Date(next.updated_at), next.id) : null,
    };
  }

  async detail(analysisId: string) {
    const rows = await this.db
      .select()
      .from(asteAnalyses)
      .where(eq(asteAnalyses.id, analysisId))
      .limit(1);
    const a = rows[0];
    if (!a) throw new NotFoundException('Analysis not found');

    const docs = await this.db
      .select({
        id: asteDocuments.id,
        docType: asteDocuments.docType,
        originalFilename: asteDocuments.originalFilename,
        sizeBytes: asteDocuments.sizeBytes,
        pageCount: asteDocuments.pageCount,
        ocrStatus: asteDocuments.ocrStatus,
        mime: asteDocuments.mime,
        createdAt: asteDocuments.createdAt,
      })
      .from(asteDocuments)
      .where(eq(asteDocuments.analysisId, analysisId));

    const chatCountRows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(asteChatMessages)
      .where(eq(asteChatMessages.analysisId, analysisId));
    const chatMessageCount = Number(chatCountRows[0]?.n ?? 0);

    return {
      id: a.id,
      userRef: this.userRef(a.userId),
      status: a.status,
      attempts: a.attempts,
      createdAt: iso(a.createdAt),
      updatedAt: iso(a.updatedAt),
      processingStartedAt: iso(a.processingStartedAt),
      failureReasonCategory: failureReasonCategory(a.failureReason),
      /** Category + raw reason code only — not document text. */
      failureReason: a.failureReason,
      language: a.language,
      register: a.register,
      provincia: a.provincia,
      comune: a.comune,
      tribunale: a.tribunale,
      rge: a.rge,
      lotto: a.lotto,
      stageHistory: [
        { at: iso(a.createdAt), event: 'created' },
        ...(a.processingStartedAt
          ? [{ at: iso(a.processingStartedAt), event: 'processing_started' }]
          : []),
        { at: iso(a.updatedAt), event: `status:${a.status}` },
      ],
      documents: docs.map((d) => ({
        id: d.id,
        docType: d.docType,
        filenameMasked: maskFilename(d.originalFilename),
        sizeBytes: d.sizeBytes,
        pageCount: d.pageCount,
        ocrStatus: d.ocrStatus,
        /** Per-doc OCR ratio is not stored outside extraction; fleet ratio is Grafana. */
        ocrRatio: null as number | null,
        mime: d.mime,
        createdAt: iso(d.createdAt),
      })),
      chatMessageCount,
      /** Explicit: never include extraction / chat / document text. */
      extraction: undefined,
      chat: undefined,
    };
  }

  async revealIdentity(analysisId: string, actorUserId: string, reason?: string) {
    const rows = await this.db
      .select({
        id: asteAnalyses.id,
        userId: asteAnalyses.userId,
      })
      .from(asteAnalyses)
      .where(eq(asteAnalyses.id, analysisId))
      .limit(1);
    const a = rows[0];
    if (!a) throw new NotFoundException('Analysis not found');

    const audit = await this.audit.record({
      actorUserId,
      action: 'aste.analysis.reveal_identity',
      resourceType: 'aste_analysis',
      resourceId: analysisId,
      subjectUserId: a.userId,
      reason: reason?.trim() || 'support',
    });

    const userRows = await this.db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, a.userId))
      .limit(1);
    const u = userRows[0];

    return {
      auditId: audit.id,
      userId: a.userId,
      userRef: this.userRef(a.userId),
      email: u?.email ?? null,
      displayName: u?.displayName ?? null,
    };
  }

  async revealFilenames(analysisId: string, actorUserId: string, reason?: string) {
    const rows = await this.db
      .select({ id: asteAnalyses.id, userId: asteAnalyses.userId })
      .from(asteAnalyses)
      .where(eq(asteAnalyses.id, analysisId))
      .limit(1);
    const a = rows[0];
    if (!a) throw new NotFoundException('Analysis not found');

    const audit = await this.audit.record({
      actorUserId,
      action: 'aste.analysis.reveal_filenames',
      resourceType: 'aste_analysis',
      resourceId: analysisId,
      subjectUserId: a.userId,
      reason: reason?.trim() || 'support',
    });

    const docs = await this.db
      .select({
        id: asteDocuments.id,
        originalFilename: asteDocuments.originalFilename,
        docType: asteDocuments.docType,
      })
      .from(asteDocuments)
      .where(eq(asteDocuments.analysisId, analysisId));

    return {
      auditId: audit.id,
      documents: docs.map((d) => ({
        id: d.id,
        docType: d.docType,
        originalFilename: d.originalFilename,
      })),
    };
  }

  async rerun(analysisId: string, actorUserId: string) {
    const rows = await this.db
      .select()
      .from(asteAnalyses)
      .where(eq(asteAnalyses.id, analysisId))
      .limit(1);
    const a = rows[0];
    if (!a) throw new NotFoundException('Analysis not found');

    if (a.status === 'ready') {
      throw new ConflictException({
        code: 'ASTE_RERUN_NOT_ALLOWED',
        message: 'Cannot re-run a ready analysis',
      });
    }
    if (a.status !== 'failed' && a.status !== 'processing') {
      throw new ConflictException({
        code: 'ASTE_RERUN_NOT_ALLOWED',
        message: `Cannot re-run analysis in status ${a.status}`,
      });
    }

    const priorStatus = a.status;
    const priorAttempts = a.attempts;
    const priorFailure = a.failureReason;

    await this.db
      .update(asteAnalyses)
      .set({
        status: 'uploaded',
        attempts: 0,
        failureReason: null,
        processingStartedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(asteAnalyses.id, analysisId));

    const audit = await this.audit.record({
      actorUserId,
      action: 'aste.analysis.rerun',
      resourceType: 'aste_analysis',
      resourceId: analysisId,
      subjectUserId: a.userId,
      reason: JSON.stringify({
        priorStatus,
        priorAttempts,
        priorFailureReason: priorFailure,
      }),
    });

    return {
      id: analysisId,
      status: 'uploaded' as const,
      attempts: 0,
      priorStatus,
      priorAttempts,
      auditId: audit.id,
    };
  }

  /**
   * G1 waitlist aggregates only — never returns email or guide tokens.
   */
  async waitlistStats() {
    const byLanguage = asRows<{ language: string; count: number | string }>(
      await this.db.execute(sql`
        SELECT language, COUNT(*)::int AS count
        FROM aste_leads
        GROUP BY language
        ORDER BY language
      `),
    ).map((r) => ({ language: r.language, count: Number(r.count) }));

    const byProvince = asRows<{ province: string | null; count: number | string }>(
      await this.db.execute(sql`
        SELECT province, COUNT(*)::int AS count
        FROM aste_leads
        GROUP BY province
        ORDER BY count DESC, province NULLS LAST
      `),
    ).map((r) => ({ province: r.province, count: Number(r.count) }));

    const byBuyerType = asRows<{ buyer_type: string | null; count: number | string }>(
      await this.db.execute(sql`
        SELECT buyer_type, COUNT(*)::int AS count
        FROM aste_leads
        GROUP BY buyer_type
        ORDER BY count DESC, buyer_type NULLS LAST
      `),
    ).map((r) => ({ buyerType: r.buyer_type, count: Number(r.count) }));

    const byDay = asRows<{ day: string; count: number | string }>(
      await this.db.execute(sql`
        SELECT date_trunc('day', created_at)::date::text AS day, COUNT(*)::int AS count
        FROM aste_leads
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 90
      `),
    ).map((r) => ({ day: r.day, count: Number(r.count) }));

    const totalRows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(asteLeads);
    const total = Number(totalRows[0]?.n ?? 0);

    return {
      total,
      byLanguage,
      byProvince,
      byBuyerType,
      signupsByDay: byDay,
    };
  }
}
