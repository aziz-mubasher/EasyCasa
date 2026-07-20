import { Injectable } from '@nestjs/common';

import type { PersonalDataRegistry } from './personal-data.registry';
import type { PersonalDataSource } from './personal-data-source';

export interface DataExport {
  subjectId: string;
  generatedAt: string;
  sections: { source: string; records: unknown[] }[];
}

/**
 * Right of access / data portability (GDPR Art. 15 & 20) — Phase 38.
 * Aggregates the subject's data from every registered source into one portable
 * JSON bundle. A source failing to collect surfaces as an error section rather
 * than silently dropping data.
 */
@Injectable()
export class DsarService {
  private sources: PersonalDataSource[] = [];

  /** Used by unit/e2e tests that construct the service with an explicit list. */
  constructor(sources?: PersonalDataSource[]) {
    if (sources) this.sources = sources;
  }

  bind(registry: PersonalDataRegistry): void {
    this.sources = registry.all();
  }

  async export(subjectId: string): Promise<DataExport> {
    const sections = await Promise.all(
      this.sources.map(async (s) => {
        try {
          const { source, records } = await s.collect(subjectId);
          return { source, records };
        } catch (err) {
          return { source: s.source, records: [{ error: `collect failed: ${String(err)}` }] };
        }
      }),
    );
    return { subjectId, generatedAt: new Date().toISOString(), sections };
  }
}
