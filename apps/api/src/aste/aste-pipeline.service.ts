import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRODUCT_EVENTS } from '@easycasa/shared';
import { eq, sql } from 'drizzle-orm';

import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { asteAnalyses, asteDocChunks, asteDocuments } from '../db/schema';
import { AsteAiClient } from './aste-ai.client';
import { chunkPageTexts } from './aste-chunk';
import {
  applyPrezzoBasePrecedence,
  assertLotScope,
  AsteLotScopeError,
  isLotScopeFailureReason,
} from './aste-extract-guards';
import {
  asteOcrPages,
  astePipelineFailed,
  astePipelineFailures,
  astePipelineReady,
  astePipelineStageDuration,
} from './aste-pipeline.metrics';
import { computeSemaforo } from './aste-semaforo';
import { AsteStorage } from './aste-storage';
import { primaryImmobile, type AsteExtraction } from './extraction-schema';

type ClaimedRow = {
  id: string;
  user_id: string;
  language: string;
  attempts: number;
  lotto_label: string | null;
};

/**
 * EC-23 — claim uploaded analyses and run OCR → extract → embed → ready/failed.
 * Logs: ids + stage names only (never document text, filenames, or values).
 */
@Injectable()
export class AstePipelineService {
  private readonly log = new Logger(AstePipelineService.name);
  private running = false;

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
    private readonly storage: AsteStorage,
    private readonly ai: AsteAiClient,
    private readonly analytics: ProductAnalyticsService,
  ) {}

  /** Recover stale processing rows, then claim+run at most one analysis. */
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.recoverStale();
      const claimed = await this.claimNext();
      if (!claimed) return;
      await this.runClaimed(claimed);
    } finally {
      this.running = false;
    }
  }

  async recoverStale(): Promise<number> {
    const staleMs = this.config.ASTE_PIPELINE_STALE_MS;
    const maxAttempts = this.config.ASTE_PIPELINE_MAX_ATTEMPTS;
    const result = await this.db.execute(sql`
      UPDATE aste_analyses
      SET
        status = CASE
          WHEN attempts >= ${maxAttempts} THEN 'failed'
          ELSE 'uploaded'
        END,
        failure_reason = CASE
          WHEN attempts >= ${maxAttempts} THEN 'stale_processing_exhausted'
          ELSE failure_reason
        END,
        processing_started_at = NULL,
        updated_at = now()
      WHERE status = 'processing'
        AND processing_started_at IS NOT NULL
        AND processing_started_at < now() - (${staleMs}::bigint * interval '1 millisecond')
      RETURNING id, status
    `);
    const rows = (result.rows ?? []) as Array<{ id: string; status: string }>;
    for (const r of rows) {
      this.log.warn(
        JSON.stringify({
          event: 'aste.pipeline_stale_recovered',
          analysisId: r.id,
          status: r.status,
        }),
      );
      if (r.status === 'failed') {
        astePipelineFailed.inc();
        this.analytics.track(PRODUCT_EVENTS.ASTE_ANALYSIS_FAILED, {
          reasonCategory: 'stale',
        });
      }
    }
    return rows.length;
  }

  async claimNext(): Promise<ClaimedRow | null> {
    const result = await this.db.execute(sql`
      UPDATE aste_analyses AS a
      SET
        status = 'processing',
        attempts = a.attempts + 1,
        processing_started_at = now(),
        failure_reason = NULL,
        updated_at = now()
      FROM (
        SELECT id
        FROM aste_analyses
        WHERE status = 'uploaded'
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      ) AS pick
      WHERE a.id = pick.id
      RETURNING a.id, a.user_id, a.language, a.attempts, a.lotto_label
    `);
    const rows = (result.rows ?? []) as ClaimedRow[];
    return rows[0] ?? null;
  }

  async runClaimed(claimed: ClaimedRow): Promise<void> {
    const analysisId = claimed.id;
    this.analytics.track(PRODUCT_EVENTS.ASTE_ANALYSIS_PROCESSING_STARTED, {});
    this.log.log(JSON.stringify({ event: 'aste.pipeline_started', analysisId, stage: 'claim' }));

    try {
      const docs = await this.db
        .select()
        .from(asteDocuments)
        .where(eq(asteDocuments.analysisId, analysisId));

      if (!docs.length) {
        await this.fail(analysisId, claimed.attempts, 'no_documents', 'ocr');
        return;
      }

      const extractDocs: Array<{
        file: string;
        doc_type: string;
        pages: Array<{ page: number; text: string }>;
        documentId: string;
        ocrPages: number;
        pageCount: number;
      }> = [];

      for (const doc of docs) {
        const stageTimer = astePipelineStageDuration.startTimer({ stage: 'ocr' });
        try {
          const obj = await this.storage.getObject(doc.minioKey);
          // Use document id as the opaque file label sent to AI (never original filename in logs).
          const fileLabel = doc.id;
          const ocr = await this.ai.ocr({
            buffer: obj.body,
            filename: `${fileLabel}.bin`,
            mimetype: doc.mime,
          });
          for (const p of ocr.pages) {
            asteOcrPages.inc({ ocr_used: p.ocr_used ? 'true' : 'false' });
          }
          await this.db
            .update(asteDocuments)
            .set({
              ocrStatus: 'done',
              pageCount: ocr.page_count,
            })
            .where(eq(asteDocuments.id, doc.id));
          extractDocs.push({
            file: fileLabel,
            doc_type: doc.docType,
            pages: ocr.pages.map((p) => ({ page: p.page, text: p.text })),
            documentId: doc.id,
            ocrPages: ocr.ocr_pages,
            pageCount: ocr.page_count,
          });
          this.log.log(
            JSON.stringify({
              event: 'aste.pipeline_stage',
              analysisId,
              documentId: doc.id,
              stage: 'ocr',
              pages: ocr.page_count,
              ocrPages: ocr.ocr_pages,
            }),
          );
        } catch (err) {
          astePipelineFailures.inc({ stage: 'ocr' });
          await this.db
            .update(asteDocuments)
            .set({ ocrStatus: 'failed' })
            .where(eq(asteDocuments.id, doc.id));
          throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
            stage: 'ocr',
          });
        } finally {
          stageTimer();
        }
      }

      let extraction: AsteExtraction;
      {
        const stageTimer = astePipelineStageDuration.startTimer({ stage: 'extract' });
        try {
          extraction = await this.ai.extract({
            language: claimed.language,
            lotto_label: claimed.lotto_label,
            documents: extractDocs.map((d) => ({
              file: d.file,
              doc_type: d.doc_type,
              pages: d.pages,
            })),
          });
          if (extraction.schema_version !== 2) {
            throw new Error('extract_schema_version');
          }
          extraction.meta = {
            ...extraction.meta,
            schema_version: 2,
            documents: extractDocs.map((d) => ({
              file: d.file,
              doc_type: d.doc_type,
              pages: d.pageCount,
              ocr_pages: d.ocrPages,
            })),
            not_found: extraction.meta?.not_found ?? [],
            warnings: extraction.meta?.warnings ?? [],
            lotti_trovati: extraction.meta?.lotti_trovati ?? [],
            lotto: extraction.meta?.lotto ?? null,
          };
          assertLotScope(extraction, claimed.lotto_label);
          extraction = applyPrezzoBasePrecedence(extraction);
          this.log.log(
            JSON.stringify({ event: 'aste.pipeline_stage', analysisId, stage: 'extract' }),
          );
        } catch (err) {
          astePipelineFailures.inc({ stage: 'extract' });
          throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
            stage: 'extract',
          });
        } finally {
          stageTimer();
        }
      }

      const semaforo = computeSemaforo(extraction);
      const primary = primaryImmobile(extraction);

      {
        const stageTimer = astePipelineStageDuration.startTimer({ stage: 'embed' });
        try {
          // Replace prior chunks on re-attempt.
          for (const d of extractDocs) {
            await this.db.delete(asteDocChunks).where(eq(asteDocChunks.documentId, d.documentId));
          }
          for (const d of extractDocs) {
            const chunks = chunkPageTexts(d.pages);
            if (!chunks.length) continue;
            const embeddings = await this.ai.embed(chunks.map((c) => c.text));
            if (embeddings.length !== chunks.length) {
              throw new Error('embed_count_mismatch');
            }
            for (let i = 0; i < chunks.length; i++) {
              const emb = embeddings[i]!;
              if (emb.length !== 1536) throw new Error('embed_dim');
              const vectorLiteral = `[${emb.join(',')}]`;
              await this.db.execute(sql`
                INSERT INTO aste_doc_chunks (document_id, page, chunk_index, text, embedding)
                VALUES (
                  ${d.documentId}::uuid,
                  ${chunks[i]!.page},
                  ${chunks[i]!.chunkIndex},
                  ${chunks[i]!.text},
                  ${vectorLiteral}::vector
                )
              `);
            }
          }
          this.log.log(
            JSON.stringify({ event: 'aste.pipeline_stage', analysisId, stage: 'embed' }),
          );
        } catch (err) {
          astePipelineFailures.inc({ stage: 'embed' });
          throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
            stage: 'embed',
          });
        } finally {
          stageTimer();
        }
      }

      await this.db
        .update(asteAnalyses)
        .set({
          status: 'ready',
          extraction,
          semaforo,
          failureReason: null,
          processingStartedAt: null,
          updatedAt: new Date(),
          tribunale: extraction.procedura.tribunale,
          rge: extraction.procedura.rge ?? extraction.procedura.numero,
          lotto: extraction.procedura.lotto ?? claimed.lotto_label,
          comune: primary.comune,
          provincia: primary.provincia,
          addressRaw: primary.indirizzo,
        })
        .where(eq(asteAnalyses.id, analysisId));

      astePipelineReady.inc();
      this.analytics.track(PRODUCT_EVENTS.ASTE_ANALYSIS_READY, {});
      this.log.log(JSON.stringify({ event: 'aste.pipeline_ready', analysisId, stage: 'ready' }));
    } catch (err) {
      const stage =
        err && typeof err === 'object' && 'stage' in err
          ? String((err as { stage: string }).stage)
          : 'unknown';
      if (err instanceof AsteLotScopeError) {
        await this.fail(analysisId, claimed.attempts, err.message, stage, true);
        return;
      }
      const reason = categorizeFailure(stage, err);
      await this.fail(analysisId, claimed.attempts, reason, stage);
    }
  }

  private async fail(
    analysisId: string,
    attempts: number,
    reason: string,
    stage: string,
    forceFailed = false,
  ): Promise<void> {
    const maxAttempts = this.config.ASTE_PIPELINE_MAX_ATTEMPTS;
    const lotFail = forceFailed || isLotScopeFailureReason(reason);
    const exhausted = lotFail || attempts >= maxAttempts;
    const nextStatus = exhausted ? 'failed' : 'uploaded';
    await this.db
      .update(asteAnalyses)
      .set({
        status: nextStatus,
        failureReason: reason,
        processingStartedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(asteAnalyses.id, analysisId));

    this.log.warn(
      JSON.stringify({
        event: 'aste.pipeline_failed',
        analysisId,
        stage,
        reason,
        status: nextStatus,
        attempts,
      }),
    );

    if (exhausted) {
      astePipelineFailed.inc();
      this.analytics.track(PRODUCT_EVENTS.ASTE_ANALYSIS_FAILED, {
        reasonCategory: reason,
      });
    } else {
      astePipelineFailures.inc({ stage });
    }
  }
}

function categorizeFailure(stage: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/^extract_upstream:\d+$/.test(msg)) return msg;
  if (/timeout/i.test(msg)) return `${stage}_timeout`;
  if (/HTTP 401|token/i.test(msg)) return `${stage}_auth`;
  if (/HTTP 5/i.test(msg)) return `${stage}_upstream`;
  if (/HTTP 4/i.test(msg)) return `${stage}_upstream`;
  if (/embed_dim|embed_count|schema_version/i.test(msg)) return `${stage}_invalid`;
  if (/CHAT_PROVIDER|extract_unavailable/i.test(msg)) return 'extract_unavailable';
  return `${stage}_error`;
}
