import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PRODUCT_EVENTS } from '@easycasa/shared';
import { and, eq } from 'drizzle-orm';

import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { asteAnalyses, asteDocuments, asteGlossary } from '../db/schema';
import { AsteAiClient } from './aste-ai.client';
import {
  applyBuyerReadinessToSemaforo,
  computeBuyerReadiness,
  emptyBuyerProfile,
  isBuyerProfileSkipped,
  type AsteBuyerProfile,
  type BuyerReadinessResult,
} from './aste-buyer-readiness';
import { buildCriticitaCards } from './aste-criticita';
import {
  collectFreeTextSnippets,
  translationMapFromSnippets,
  type TranslationCache,
} from './aste-free-text';
import type { AsteOmiCheck } from './aste-omi-check';
import { AsteOmiCheckService } from './aste-omi-check.service';
import type { AsteExtractionV2, AsteSemaforo } from './extraction-schema';

@Injectable()
export class AsteReportService {
  private readonly log = new Logger(AsteReportService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly omi: AsteOmiCheckService,
    private readonly ai: AsteAiClient,
    private readonly analytics: ProductAnalyticsService,
  ) {}

  async getReport(
    userId: string,
    analysisId: string,
    opts: { lang: 'it' | 'en' | 'es'; trackPrint?: boolean },
  ) {
    const analysis = await this.requireOwnedReady(userId, analysisId);
    const extraction = analysis.extraction as AsteExtractionV2 | null;
    if (!extraction) {
      throw new BadRequestException('extraction not ready');
    }
    if (extraction.schema_version !== 2) {
      throw new BadRequestException({
        code: 'ASTE_REPROCESS_REQUIRED',
        message: 'Extraction schema outdated — reprocess required',
      });
    }

    const docs = await this.db
      .select()
      .from(asteDocuments)
      .where(eq(asteDocuments.analysisId, analysisId))
      .orderBy(asteDocuments.createdAt);

    const filenameById = new Map(docs.map((d) => [d.id, d.originalFilename]));

    let omiCheck = (analysis.omiCheck as AsteOmiCheck | null) ?? null;
    if (!omiCheck) {
      omiCheck = await this.omi.compute(extraction);
      await this.db
        .update(asteAnalyses)
        .set({ omiCheck, updatedAt: new Date() })
        .where(eq(asteAnalyses.id, analysisId));
    }

    const buyerProfile = (analysis.buyerProfile as AsteBuyerProfile | null) ?? null;
    const readiness = computeBuyerReadiness(buyerProfile, extraction);
    let semaforo = (analysis.semaforo as AsteSemaforo | null) ?? null;
    if (!semaforo || semaforo.buyer_readiness !== readiness.level) {
      semaforo = applyBuyerReadinessToSemaforo(semaforo, readiness);
      await this.db
        .update(asteAnalyses)
        .set({ semaforo, updatedAt: new Date() })
        .where(eq(asteAnalyses.id, analysisId));
    }

    const reportLang: 'it' | 'en' = opts.lang === 'en' ? 'en' : 'it';
    const esContentFallback = opts.lang === 'es';

    let translations: TranslationCache =
      ((analysis.translations as TranslationCache | null) ?? {}) as TranslationCache;
    let translateCalls = 0;

    if (reportLang === 'en') {
      const cached = translations.en;
      if (!cached || Object.keys(cached).length === 0) {
        const snippets = collectFreeTextSnippets(extraction);
        if (snippets.length > 0) {
          const translated = await this.ai.translate({
            texts: snippets.map((s) => s.text),
            target_lang: 'en',
          });
          translateCalls = 1;
          const map = translationMapFromSnippets(snippets, translated);
          translations = { ...translations, en: map };
          await this.db
            .update(asteAnalyses)
            .set({ translations, updatedAt: new Date() })
            .where(eq(asteAnalyses.id, analysisId));
        } else {
          translations = { ...translations, en: {} };
          await this.db
            .update(asteAnalyses)
            .set({ translations, updatedAt: new Date() })
            .where(eq(asteAnalyses.id, analysisId));
        }
      }
    }

    const glossaryLang = reportLang;
    const glossaryRows = await this.db
      .select()
      .from(asteGlossary)
      .where(
        and(eq(asteGlossary.language, glossaryLang), eq(asteGlossary.register, analysis.register)),
      );

    const criticita = buildCriticitaCards(semaforo, extraction);

    this.analytics.track(PRODUCT_EVENTS.ASTE_REPORT_VIEWED, {
      language: opts.lang,
      register: analysis.register,
      report_content_lang: reportLang,
    });
    if (opts.trackPrint) {
      this.analytics.track(PRODUCT_EVENTS.ASTE_REPORT_PRINTED, {
        language: opts.lang,
        register: analysis.register,
      });
    }

    this.log.log(
      JSON.stringify({
        event: 'aste.report_viewed',
        analysisId,
        language: opts.lang,
        register: analysis.register,
        translateCalls,
      }),
    );

    return {
      id: analysis.id,
      status: analysis.status,
      language: analysis.language,
      register: analysis.register,
      tribunale: analysis.tribunale,
      rge: analysis.rge,
      lotto: analysis.lotto,
      lottoLabel: analysis.lottoLabel,
      dataAsta: analysis.dataAsta,
      termineOfferte: analysis.termineOfferte?.toISOString() ?? null,
      addressRaw: analysis.addressRaw,
      comune: analysis.comune,
      provincia: analysis.provincia,
      extraction,
      semaforo,
      omiCheck,
      buyerProfile,
      buyerReadiness: readiness,
      buyerProfileSkipped: isBuyerProfileSkipped(buyerProfile),
      translations: reportLang === 'en' ? translations.en ?? {} : {},
      reportContentLang: reportLang,
      esContentFallback,
      criticita,
      documents: docs.map((d) => ({
        id: d.id,
        originalFilename: d.originalFilename,
        docType: d.docType,
        pageCount: d.pageCount,
      })),
      filenameById: Object.fromEntries(filenameById),
      glossary: glossaryRows.map((g) => ({
        termKey: g.termKey,
        definition: g.definition,
        counselReviewed: g.counselReviewed,
      })),
      translateCalls,
    };
  }

  async patchAnalysis(
    userId: string,
    analysisId: string,
    patch: {
      register?: 'investor' | 'first_buyer';
      residency?: AsteBuyerProfile['residency'];
      purpose?: AsteBuyerProfile['purpose'];
      has_cf?: boolean | null;
      has_pec_firma?: boolean | null;
      financing_needed?: boolean | null;
      skip_buyer_profile?: boolean;
    },
  ) {
    const analysis = await this.requireOwned(userId, analysisId);
    const extraction = analysis.extraction as AsteExtractionV2 | null;

    let buyerProfile = (analysis.buyerProfile as AsteBuyerProfile | null) ?? emptyBuyerProfile();
    let register = analysis.register;

    if (patch.register) register = patch.register;

    if (patch.skip_buyer_profile) {
      buyerProfile = emptyBuyerProfile();
    } else {
      if (patch.residency !== undefined) buyerProfile = { ...buyerProfile, residency: patch.residency };
      if (patch.purpose !== undefined) buyerProfile = { ...buyerProfile, purpose: patch.purpose };
      if (patch.has_cf !== undefined) buyerProfile = { ...buyerProfile, has_cf: patch.has_cf };
      if (patch.has_pec_firma !== undefined) {
        buyerProfile = { ...buyerProfile, has_pec_firma: patch.has_pec_firma };
      }
      if (patch.financing_needed !== undefined) {
        buyerProfile = { ...buyerProfile, financing_needed: patch.financing_needed };
      }
    }

    const readiness: BuyerReadinessResult = computeBuyerReadiness(buyerProfile, extraction);
    const semaforo = applyBuyerReadinessToSemaforo(
      analysis.semaforo as AsteSemaforo | null,
      readiness,
    );

    const [updated] = await this.db
      .update(asteAnalyses)
      .set({
        register,
        buyerProfile: isBuyerProfileSkipped(buyerProfile) ? null : buyerProfile,
        semaforo,
        updatedAt: new Date(),
      })
      .where(and(eq(asteAnalyses.id, analysisId), eq(asteAnalyses.userId, userId)))
      .returning();

    if (!isBuyerProfileSkipped(buyerProfile)) {
      this.analytics.track(PRODUCT_EVENTS.ASTE_BUYER_PROFILE_COMPLETED, {
        residency: buyerProfile.residency ?? 'unknown',
        purpose: buyerProfile.purpose ?? 'unknown',
      });
    }

    return {
      id: updated!.id,
      register: updated!.register,
      buyerProfile: (updated!.buyerProfile as AsteBuyerProfile | null) ?? null,
      semaforo: updated!.semaforo,
      buyerReadiness: readiness,
    };
  }

  private async requireOwned(userId: string, analysisId: string) {
    const rows = await this.db
      .select()
      .from(asteAnalyses)
      .where(eq(asteAnalyses.id, analysisId))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('analysis not found');
    if (row.userId !== userId) {
      // Match brief: non-owner → 403/404; use 404 to avoid id oracle
      throw new NotFoundException('analysis not found');
    }
    return row;
  }

  private async requireOwnedReady(userId: string, analysisId: string) {
    const row = await this.requireOwned(userId, analysisId);
    if (row.status !== 'ready') {
      throw new BadRequestException('analysis is not ready');
    }
    return row;
  }
}
