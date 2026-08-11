import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PRODUCT_EVENTS } from '@easycasa/shared';
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { asteAnalyses, asteDocuments } from '../db/schema';
import { AsteStorage } from './aste-storage';
import type { AsteDocType } from './dto/create-aste-analysis.dto';

const ALLOWED_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 20;

function sizeBucket(bytes: number): string {
  if (bytes < 1024 * 1024) return 'lt_1mb';
  if (bytes < 5 * 1024 * 1024) return '1_5mb';
  if (bytes < 20 * 1024 * 1024) return '5_20mb';
  return '20_50mb';
}

function sniffMime(buf: Buffer, declared: string): string {
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return 'application/pdf';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'image/png';
  }
  return declared.split(';')[0]!.trim().toLowerCase();
}

@Injectable()
export class AsteAnalysisService {
  private readonly log = new Logger(AsteAnalysisService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly storage: AsteStorage,
    private readonly analytics: ProductAnalyticsService,
  ) {}

  async create(
    userId: string,
    input: {
      language?: 'it' | 'en' | 'es';
      register?: 'investor' | 'first_buyer';
      lottoLabel?: string | null;
    },
  ) {
    const language = input.language ?? 'it';
    const register = input.register ?? 'investor';
    const lottoLabel = input.lottoLabel?.trim() || null;
    const [row] = await this.db
      .insert(asteAnalyses)
      .values({
        userId,
        status: 'draft',
        language,
        register,
        lottoLabel,
      })
      .returning();
    this.analytics.track(PRODUCT_EVENTS.ASTE_ANALYSIS_CREATED, {
      language,
      register,
    });
    this.log.log(JSON.stringify({ event: 'aste.analysis_created', analysisId: row!.id }));
    return this.toAnalysisDto(row!);
  }

  async list(userId: string) {
    const rows = await this.db
      .select()
      .from(asteAnalyses)
      .where(eq(asteAnalyses.userId, userId))
      .orderBy(desc(asteAnalyses.createdAt));
    return rows.map((r) => this.toAnalysisDto(r));
  }

  async get(userId: string, analysisId: string) {
    const analysis = await this.requireOwned(userId, analysisId);
    const docs = await this.db
      .select()
      .from(asteDocuments)
      .where(eq(asteDocuments.analysisId, analysisId))
      .orderBy(asteDocuments.createdAt);
    return {
      ...this.toAnalysisDto(analysis),
      documents: docs.map((d) => this.toDocDto(d)),
    };
  }

  async uploadDocument(
    userId: string,
    analysisId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    docType: AsteDocType,
  ) {
    const analysis = await this.requireOwned(userId, analysisId);
    if (analysis.status !== 'draft') {
      throw new BadRequestException('documents can only be added while status is draft');
    }

    const countRows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(asteDocuments)
      .where(eq(asteDocuments.analysisId, analysisId));
    const count = Number(countRows[0]?.n ?? 0);
    if (count >= MAX_FILES) {
      throw new BadRequestException(`maximum ${MAX_FILES} files per analysis`);
    }

    if (!file?.buffer?.length) throw new BadRequestException('file required');
    if (file.buffer.length > MAX_BYTES) {
      throw new BadRequestException(`file exceeds ${MAX_BYTES} bytes`);
    }

    const mime = sniffMime(file.buffer, file.mimetype || '');
    if (!ALLOWED_MIMES.has(mime)) {
      throw new BadRequestException('only PDF, JPEG, and PNG are allowed');
    }

    const docId = randomUUID();
    const filename = file.originalname || 'document';
    const key = this.storage.buildKey(userId, analysisId, docId, filename);

    await this.storage.putObject(key, file.buffer, mime);

    const [doc] = await this.db
      .insert(asteDocuments)
      .values({
        id: docId,
        analysisId,
        minioKey: key,
        originalFilename: filename.slice(0, 240),
        docType,
        mime,
        sizeBytes: file.buffer.length,
        ocrStatus: 'pending',
      })
      .returning();

    await this.db
      .update(asteAnalyses)
      .set({ updatedAt: new Date() })
      .where(eq(asteAnalyses.id, analysisId));

    this.analytics.track(PRODUCT_EVENTS.ASTE_DOCUMENT_UPLOADED, {
      docType,
      sizeBucket: sizeBucket(file.buffer.length),
    });
    this.log.log(
      JSON.stringify({
        event: 'aste.document_uploaded',
        analysisId,
        documentId: docId,
        docType,
        sizeBucket: sizeBucket(file.buffer.length),
      }),
    );

    return this.toDocDto(doc!);
  }

  async submit(userId: string, analysisId: string) {
    const analysis = await this.requireOwned(userId, analysisId);
    if (analysis.status !== 'draft') {
      throw new BadRequestException('only draft analyses can be submitted');
    }
    const docs = await this.db
      .select({ id: asteDocuments.id })
      .from(asteDocuments)
      .where(eq(asteDocuments.analysisId, analysisId))
      .limit(1);
    if (!docs.length) {
      throw new BadRequestException('at least one document is required');
    }

    const [updated] = await this.db
      .update(asteAnalyses)
      .set({ status: 'uploaded', updatedAt: new Date() })
      .where(and(eq(asteAnalyses.id, analysisId), eq(asteAnalyses.userId, userId)))
      .returning();

    this.analytics.track(PRODUCT_EVENTS.ASTE_ANALYSIS_SUBMITTED, {
      language: analysis.language,
      register: analysis.register,
    });
    this.log.log(JSON.stringify({ event: 'aste.analysis_submitted', analysisId }));
    return this.toAnalysisDto(updated!);
  }

  /**
   * EC-23b — set/correct lotto_label on draft or failed (no re-upload).
   */
  async patchLottoLabel(userId: string, analysisId: string, lottoLabel: string | null) {
    const analysis = await this.requireOwned(userId, analysisId);
    if (analysis.status !== 'draft' && analysis.status !== 'failed') {
      throw new BadRequestException('lottoLabel can only be set while draft or failed');
    }
    const label = lottoLabel == null || lottoLabel.trim() === '' ? null : lottoLabel.trim();
    const [updated] = await this.db
      .update(asteAnalyses)
      .set({ lottoLabel: label, updatedAt: new Date() })
      .where(eq(asteAnalyses.id, analysisId))
      .returning();
    return this.toAnalysisDto(updated!);
  }

  /**
   * EC-23b — resubmit failed analysis (docs retained) after correcting lotto_label.
   */
  async resubmit(userId: string, analysisId: string) {
    const analysis = await this.requireOwned(userId, analysisId);
    if (analysis.status !== 'failed') {
      throw new BadRequestException('only failed analyses can be resubmitted');
    }
    const docs = await this.db
      .select({ id: asteDocuments.id })
      .from(asteDocuments)
      .where(eq(asteDocuments.analysisId, analysisId))
      .limit(1);
    if (!docs.length) {
      throw new BadRequestException('at least one document is required');
    }

    const [updated] = await this.db
      .update(asteAnalyses)
      .set({
        status: 'uploaded',
        attempts: 0,
        failureReason: null,
        processingStartedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(asteAnalyses.id, analysisId))
      .returning();

    this.analytics.track(PRODUCT_EVENTS.ASTE_ANALYSIS_SUBMITTED, {
      language: analysis.language,
      register: analysis.register,
    });
    this.log.log(JSON.stringify({ event: 'aste.analysis_resubmitted', analysisId }));
    return this.toAnalysisDto(updated!);
  }

  async remove(userId: string, analysisId: string) {
    const analysis = await this.requireOwned(userId, analysisId);
    const docs = await this.db
      .select({ id: asteDocuments.id, minioKey: asteDocuments.minioKey })
      .from(asteDocuments)
      .where(eq(asteDocuments.analysisId, analysisId));

    for (const d of docs) {
      await this.storage.deleteObject(d.minioKey);
    }

    await this.db.delete(asteAnalyses).where(eq(asteAnalyses.id, analysisId));

    this.analytics.track(PRODUCT_EVENTS.ASTE_ANALYSIS_DELETED, {
      language: analysis.language,
    });
    this.log.log(
      JSON.stringify({
        event: 'aste.analysis_deleted',
        analysisId,
        documentCount: docs.length,
      }),
    );
    return { ok: true as const };
  }

  /** Retention purge — deletes aged non-draft analyses + MinIO objects. */
  async purgeOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const stale = await this.db
      .select({ id: asteAnalyses.id })
      .from(asteAnalyses)
      .where(
        and(
          lt(asteAnalyses.createdAt, cutoff),
          inArray(asteAnalyses.status, ['uploaded', 'processing', 'ready', 'failed']),
        ),
      );
    let erased = 0;
    for (const row of stale) {
      const docs = await this.db
        .select({ minioKey: asteDocuments.minioKey })
        .from(asteDocuments)
        .where(eq(asteDocuments.analysisId, row.id));
      for (const d of docs) await this.storage.deleteObject(d.minioKey);
      await this.db.delete(asteAnalyses).where(eq(asteAnalyses.id, row.id));
      erased += 1;
    }
    if (erased) {
      this.log.log(JSON.stringify({ event: 'aste.retention_purged', erased, days }));
    }
    return erased;
  }

  /** DSAR helper — delete all analyses for a user (rows + objects). */
  async eraseForUser(userId: string): Promise<number> {
    const rows = await this.db
      .select({ id: asteAnalyses.id })
      .from(asteAnalyses)
      .where(eq(asteAnalyses.userId, userId));
    for (const row of rows) {
      const docs = await this.db
        .select({ minioKey: asteDocuments.minioKey })
        .from(asteDocuments)
        .where(eq(asteDocuments.analysisId, row.id));
      for (const d of docs) await this.storage.deleteObject(d.minioKey);
    }
    if (!rows.length) return 0;
    await this.db.delete(asteAnalyses).where(eq(asteAnalyses.userId, userId));
    return rows.length;
  }

  private async requireOwned(userId: string, analysisId: string) {
    const rows = await this.db
      .select()
      .from(asteAnalyses)
      .where(eq(asteAnalyses.id, analysisId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('analysis not found');
    if (row.userId !== userId) throw new ForbiddenException('not your analysis');
    return row;
  }

  private toAnalysisDto(r: typeof asteAnalyses.$inferSelect) {
    return {
      id: r.id,
      status: r.status,
      language: r.language,
      register: r.register,
      tribunale: r.tribunale,
      rge: r.rge,
      lotto: r.lotto,
      lottoLabel: r.lottoLabel,
      dataAsta: r.dataAsta,
      termineOfferte: r.termineOfferte?.toISOString() ?? null,
      addressRaw: r.addressRaw,
      comune: r.comune,
      provincia: r.provincia,
      extraction: r.extraction,
      semaforo: r.semaforo,
      omiCheck: r.omiCheck,
      buyerProfile: r.buyerProfile,
      failureReason: r.failureReason,
      attempts: r.attempts,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private toDocDto(d: typeof asteDocuments.$inferSelect) {
    return {
      id: d.id,
      analysisId: d.analysisId,
      originalFilename: d.originalFilename,
      docType: d.docType,
      mime: d.mime,
      sizeBytes: d.sizeBytes,
      pageCount: d.pageCount,
      ocrStatus: d.ocrStatus,
      createdAt: d.createdAt.toISOString(),
    };
  }
}
