import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { RRF_PER_LEG, RRF_TOP_N, rrfMerge } from './aste-rrf';

export type RetrievedChunk = {
  id: string;
  documentId: string;
  page: number;
  text: string;
};

export type RetrievalResult = {
  chunks: RetrievedChunk[];
  metrics: {
    vector_hits: number;
    lexical_hits: number;
    fused_unique: number;
    vector_only: number;
    lexical_only: number;
    both: number;
  };
};

/** Cap chars per chunk sent to the answer model. */
const CHUNK_CHAR_CAP = 1800;

@Injectable()
export class AsteChatRetrievalService {
  private readonly log = new Logger(AsteChatRetrievalService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async retrieve(input: {
    analysisId: string;
    queryIt: string;
    queryEmbedding: number[];
  }): Promise<RetrievalResult> {
    const docIds = await this.documentIds(input.analysisId);
    if (docIds.length === 0) {
      return {
        chunks: [],
        metrics: {
          vector_hits: 0,
          lexical_hits: 0,
          fused_unique: 0,
          vector_only: 0,
          lexical_only: 0,
          both: 0,
        },
      };
    }

    const [vectorIds, lexicalIds] = await Promise.all([
      this.vectorTopK(docIds, input.queryEmbedding, RRF_PER_LEG),
      this.lexicalTopK(docIds, input.queryIt, RRF_PER_LEG),
    ]);

    const fused = rrfMerge(vectorIds, lexicalIds, { limit: RRF_TOP_N });
    const chunks = await this.loadChunks(fused.ids);

    const metrics = {
      vector_hits: vectorIds.length,
      lexical_hits: lexicalIds.length,
      fused_unique: fused.ids.length,
      vector_only: fused.vectorOnly,
      lexical_only: fused.lexicalOnly,
      both: fused.both,
    };

    this.log.log(
      JSON.stringify({
        event: 'aste.chat_retrieval',
        analysisId: input.analysisId,
        ...metrics,
      }),
    );

    return { chunks, metrics };
  }

  private async documentIds(analysisId: string): Promise<string[]> {
    const res = await this.db.execute(sql`
      SELECT id FROM aste_documents WHERE analysis_id = ${analysisId}
    `);
    return (res.rows as Array<{ id: string }>).map((r) => r.id);
  }

  private async vectorTopK(
    documentIds: string[],
    embedding: number[],
    limit: number,
  ): Promise<string[]> {
    if (!embedding.length || documentIds.length === 0) return [];
    const vectorLiteral = `[${embedding.join(',')}]`;
    try {
      const res = await this.db.execute(sql`
        SELECT c.id
          FROM aste_doc_chunks c
         WHERE c.document_id IN (${sql.join(
           documentIds.map((id) => sql`${id}::uuid`),
           sql`, `,
         )})
           AND c.embedding IS NOT NULL
         ORDER BY c.embedding <=> ${vectorLiteral}::vector
         LIMIT ${limit}
      `);
      return (res.rows as Array<{ id: string }>).map((r) => r.id);
    } catch (err) {
      this.log.warn(
        JSON.stringify({
          event: 'aste.chat_vector_leg_failed',
          err: err instanceof Error ? err.message : 'unknown',
        }),
      );
      return [];
    }
  }

  private async lexicalTopK(
    documentIds: string[],
    queryIt: string,
    limit: number,
  ): Promise<string[]> {
    const q = queryIt.trim();
    if (!q || documentIds.length === 0) return [];
    try {
      const res = await this.db.execute(sql`
        SELECT c.id
          FROM aste_doc_chunks c
         WHERE c.document_id IN (${sql.join(
           documentIds.map((id) => sql`${id}::uuid`),
           sql`, `,
         )})
           AND c.text_tsv @@ plainto_tsquery('italian', ${q})
         ORDER BY ts_rank_cd(c.text_tsv, plainto_tsquery('italian', ${q})) DESC
         LIMIT ${limit}
      `);
      return (res.rows as Array<{ id: string }>).map((r) => r.id);
    } catch (err) {
      this.log.warn(
        JSON.stringify({
          event: 'aste.chat_lexical_leg_failed',
          err: err instanceof Error ? err.message : 'unknown',
        }),
      );
      return [];
    }
  }

  private async loadChunks(ids: string[]): Promise<RetrievedChunk[]> {
    if (ids.length === 0) return [];
    const res = await this.db.execute(sql`
      SELECT id, document_id, page, text
        FROM aste_doc_chunks
       WHERE id IN (${sql.join(
         ids.map((id) => sql`${id}::uuid`),
         sql`, `,
       )})
    `);
    const byId = new Map(
      (res.rows as Array<{ id: string; document_id: string; page: number; text: string }>).map(
        (r) => [
          r.id,
          {
            id: r.id,
            documentId: r.document_id,
            page: Number(r.page),
            text: (r.text ?? '').slice(0, CHUNK_CHAR_CAP),
          } satisfies RetrievedChunk,
        ],
      ),
    );
    return ids.map((id) => byId.get(id)).filter((c): c is RetrievedChunk => Boolean(c));
  }
}
