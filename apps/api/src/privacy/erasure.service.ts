import { Injectable, Logger } from '@nestjs/common';

import type { PersonalDataRegistry } from './personal-data.registry';
import type { ErasureOutcome, PersonalDataSource } from './personal-data-source';

export interface ErasureReport {
  subjectId: string;
  requestedAt: string;
  outcomes: ErasureOutcome[];
  /** False when anything was retained under legal hold or a source errored. */
  fullyErased: boolean;
}

/**
 * Right to erasure (GDPR Art. 17) — Phase 38.
 * Erasure is NOT absolute: data required for a legal obligation is retained
 * under legal hold and reported.
 */
@Injectable()
export class ErasureService {
  private readonly logger = new Logger(ErasureService.name);
  private sources: PersonalDataSource[] = [];

  constructor(sources?: PersonalDataSource[]) {
    if (sources) this.sources = sources;
  }

  bind(registry: PersonalDataRegistry): void {
    this.sources = registry.all();
  }

  async erase(subjectId: string): Promise<ErasureReport> {
    const outcomes: ErasureOutcome[] = [];
    for (const s of this.sources) {
      try {
        outcomes.push(await s.erase(subjectId));
      } catch (err) {
        this.logger.error(`erase failed for ${s.source}: ${String(err)}`);
        outcomes.push({
          source: s.source,
          erased: 0,
          retainedUnderLegalHold: 0,
          note: `error: ${String(err)}`,
        });
      }
    }
    const fullyErased = outcomes.every(
      (o) => o.retainedUnderLegalHold === 0 && !o.note?.startsWith('error'),
    );
    return { subjectId, requestedAt: new Date().toISOString(), outcomes, fullyErased };
  }
}
