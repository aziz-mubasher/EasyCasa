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
 * Sources are bound at boot via {@link PersonalDataRegistrar} (no constructor DI).
 */
@Injectable()
export class DsarService {
  private sources: PersonalDataSource[] = [];

  bind(registry: PersonalDataRegistry): void {
    this.sources = registry.all();
  }

  /** Unit/e2e helper — Nest must not see constructor params (emitDecoratorMetadata). */
  withSources(sources: PersonalDataSource[]): this {
    this.sources = sources;
    return this;
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
