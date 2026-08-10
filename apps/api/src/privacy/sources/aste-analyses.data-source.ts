import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { asteAnalyses, asteDocuments } from '../../db/schema';
import { AsteAnalysisService } from '../../aste/aste-analysis.service';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../personal-data-source';

/**
 * EC-22 — user-tied aste analyses + document metadata (not file binaries).
 * Erasure cascades DB rows and deletes MinIO objects via AsteAnalysisService.
 */
@Injectable()
export class AsteAnalysesDataSource implements PersonalDataSource {
  readonly source = 'aste_analyses';

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly analyses: AsteAnalysisService,
  ) {}

  async collect(subjectId: string): Promise<CollectedData> {
    const rows = await this.db
      .select({
        id: asteAnalyses.id,
        status: asteAnalyses.status,
        language: asteAnalyses.language,
        register: asteAnalyses.register,
        comune: asteAnalyses.comune,
        provincia: asteAnalyses.provincia,
        extraction: asteAnalyses.extraction,
        semaforo: asteAnalyses.semaforo,
        failureReason: asteAnalyses.failureReason,
        createdAt: asteAnalyses.createdAt,
      })
      .from(asteAnalyses)
      .where(eq(asteAnalyses.userId, subjectId));

    const records = [];
    for (const r of rows) {
      const docs = await this.db
        .select({
          id: asteDocuments.id,
          originalFilename: asteDocuments.originalFilename,
          docType: asteDocuments.docType,
          mime: asteDocuments.mime,
          sizeBytes: asteDocuments.sizeBytes,
          createdAt: asteDocuments.createdAt,
        })
        .from(asteDocuments)
        .where(eq(asteDocuments.analysisId, r.id));
      records.push({
        id: r.id,
        status: r.status,
        language: r.language,
        register: r.register,
        comune: r.comune,
        provincia: r.provincia,
        // EC-23 — extraction/semaforo are structured fields (no binaries; no person-name schema fields).
        hasExtraction: r.extraction != null,
        semaforo: r.semaforo,
        failureReason: r.failureReason,
        extraction: r.extraction,
        createdAt: r.createdAt.toISOString(),
        documents: docs.map((d) => ({
          id: d.id,
          originalFilename: d.originalFilename,
          docType: d.docType,
          mime: d.mime,
          sizeBytes: d.sizeBytes,
          createdAt: d.createdAt.toISOString(),
        })),
      });
    }
    return { source: this.source, records };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    const erased = await this.analyses.eraseForUser(subjectId);
    return {
      source: this.source,
      erased,
      retainedUnderLegalHold: 0,
      note: 'analyses, documents, chunks, and MinIO objects removed',
    };
  }
}
