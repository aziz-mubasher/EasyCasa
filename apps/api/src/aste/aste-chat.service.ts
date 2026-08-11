import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PRODUCT_EVENTS } from '@easycasa/shared';
import { and, eq, gte, sql } from 'drizzle-orm';

import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { asteAnalyses, asteChatMessages, asteDocuments, asteGlossary } from '../db/schema';
import { AsteAiClient } from './aste-ai.client';
import { AsteChatRetrievalService } from './aste-chat-retrieval.service';

const MAX_QUESTION_CHARS = 1000;

export type ChatCitation = { document_id: string; page: number };

@Injectable()
export class AsteChatService {
  private readonly log = new Logger(AsteChatService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
    private readonly retrieval: AsteChatRetrievalService,
    private readonly ai: AsteAiClient,
    private readonly analytics: ProductAnalyticsService,
  ) {}

  async history(userId: string, analysisId: string) {
    await this.requireOwned(userId, analysisId);
    const rows = await this.db
      .select()
      .from(asteChatMessages)
      .where(eq(asteChatMessages.analysisId, analysisId))
      .orderBy(asteChatMessages.createdAt);

    const docs = await this.db
      .select({ id: asteDocuments.id, originalFilename: asteDocuments.originalFilename })
      .from(asteDocuments)
      .where(eq(asteDocuments.analysisId, analysisId));
    const filenameById = Object.fromEntries(docs.map((d) => [d.id, d.originalFilename]));

    return {
      messages: rows.map((r) => ({
        id: r.id,
        role: r.role,
        content: r.content,
        lang: r.lang,
        citations: (r.citations as ChatCitation[] | null) ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      filenameById,
    };
  }

  async ask(
    userId: string,
    analysisId: string,
    input: { question: string; lang: 'it' | 'en' },
  ) {
    const analysis = await this.requireOwnedReady(userId, analysisId);
    const question = (input.question ?? '').trim();
    if (!question) {
      throw new HttpException({ message: 'question required' }, HttpStatus.BAD_REQUEST);
    }
    if (question.length > MAX_QUESTION_CHARS) {
      throw new HttpException(
        { message: `question exceeds ${MAX_QUESTION_CHARS} characters` },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.assertRateLimits(userId, analysisId);

    const [userMsg] = await this.db
      .insert(asteChatMessages)
      .values({
        analysisId,
        role: 'user',
        content: question,
        lang: input.lang,
        citations: null,
      })
      .returning();

    let queryIt = question;
    if (input.lang !== 'it') {
      const translated = await this.ai.translate({ texts: [question], target_lang: 'it' });
      queryIt = (translated[0] ?? question).trim() || question;
    }

    const embeddings = await this.ai.embed([queryIt]);
    const queryEmbedding = embeddings[0] ?? [];
    const { chunks, metrics } = await this.retrieval.retrieve({
      analysisId,
      queryIt,
      queryEmbedding,
    });

    const glossaryLang = input.lang === 'en' ? 'en' : 'it';
    const glossaryRows = await this.db
      .select()
      .from(asteGlossary)
      .where(
        and(eq(asteGlossary.language, glossaryLang), eq(asteGlossary.register, analysis.register)),
      );

    const aiRes = await this.ai.chatAnswer({
      question,
      answer_lang: input.lang,
      lotto_label: analysis.lottoLabel,
      chunks: chunks.map((c) => ({
        document_id: c.documentId,
        page: c.page,
        text: c.text,
      })),
      glossary: glossaryRows.map((g) => ({
        term_key: g.termKey,
        definition: g.definition,
      })),
    });

    const citations = (aiRes.citations ?? []).filter(
      (c): c is ChatCitation =>
        typeof c.document_id === 'string' && Number.isFinite(c.page),
    );

    const [assistantMsg] = await this.db
      .insert(asteChatMessages)
      .values({
        analysisId,
        role: 'assistant',
        content: aiRes.answer,
        lang: input.lang,
        citations,
      })
      .returning();

    const category = aiRes.refused
      ? 'refused'
      : citations.length === 0
        ? 'not_found'
        : 'answered';

    this.analytics.track(PRODUCT_EVENTS.ASTE_CHAT_QUESTION_ASKED, {
      lang: input.lang,
      category,
      refused: aiRes.refused,
    });

    this.log.log(
      JSON.stringify({
        event: 'aste.chat_question_asked',
        analysisId,
        lang: input.lang,
        category,
        ...metrics,
      }),
    );

    const docs = await this.db
      .select({ id: asteDocuments.id, originalFilename: asteDocuments.originalFilename })
      .from(asteDocuments)
      .where(eq(asteDocuments.analysisId, analysisId));
    const filenameById = Object.fromEntries(docs.map((d) => [d.id, d.originalFilename]));

    return {
      userMessage: {
        id: userMsg!.id,
        role: 'user' as const,
        content: userMsg!.content,
        lang: userMsg!.lang,
        citations: null,
        createdAt: userMsg!.createdAt.toISOString(),
      },
      assistantMessage: {
        id: assistantMsg!.id,
        role: 'assistant' as const,
        content: assistantMsg!.content,
        lang: assistantMsg!.lang,
        citations,
        refused: aiRes.refused,
        createdAt: assistantMsg!.createdAt.toISOString(),
      },
      filenameById,
      retrieval: metrics,
    };
  }

  private async assertRateLimits(userId: string, analysisId: string) {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);

    const perAnalysis = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(asteChatMessages)
      .where(
        and(
          eq(asteChatMessages.analysisId, analysisId),
          eq(asteChatMessages.role, 'user'),
          gte(asteChatMessages.createdAt, dayStart),
        ),
      );
    const analysisCount = Number(perAnalysis[0]?.n ?? 0);
    if (analysisCount >= this.config.ASTE_CHAT_Q_PER_ANALYSIS_DAY) {
      this.analytics.track(PRODUCT_EVENTS.ASTE_CHAT_RATE_LIMITED, {
        scope: 'analysis',
      });
      throw new HttpException(
        {
          message: `Daily limit of ${this.config.ASTE_CHAT_Q_PER_ANALYSIS_DAY} questions for this analysis reached. Try again tomorrow.`,
          code: 'ASTE_CHAT_ANALYSIS_DAY_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const perUser = await this.db.execute(sql`
      SELECT count(*)::int AS n
        FROM aste_chat_messages m
        JOIN aste_analyses a ON a.id = m.analysis_id
       WHERE a.user_id = ${userId}::uuid
         AND m.role = 'user'
         AND m.created_at >= ${dayStart}
    `);
    const userCount = Number((perUser.rows[0] as { n: number } | undefined)?.n ?? 0);
    if (userCount >= this.config.ASTE_CHAT_Q_PER_USER_DAY) {
      this.analytics.track(PRODUCT_EVENTS.ASTE_CHAT_RATE_LIMITED, {
        scope: 'user',
      });
      throw new HttpException(
        {
          message: `Daily limit of ${this.config.ASTE_CHAT_Q_PER_USER_DAY} questions reached. Try again tomorrow.`,
          code: 'ASTE_CHAT_USER_DAY_LIMIT',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async requireOwned(userId: string, analysisId: string) {
    const rows = await this.db
      .select()
      .from(asteAnalyses)
      .where(eq(asteAnalyses.id, analysisId))
      .limit(1);
    const row = rows[0];
    if (!row || row.userId !== userId) {
      throw new NotFoundException('analysis not found');
    }
    return row;
  }

  private async requireOwnedReady(userId: string, analysisId: string) {
    const row = await this.requireOwned(userId, analysisId);
    if (row.status !== 'ready') {
      throw new ConflictException('analysis is not ready');
    }
    return row;
  }
}
