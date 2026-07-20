import { Inject, Injectable, Logger } from '@nestjs/common';

/** Storage seam for retention — real impl anonymizes rows; tests use in-memory. */
export interface RetentionSink {
  /** Anonymize unconverted seeker leads older than the cutoff; return count. */
  anonymizeStaleLeadsBefore(cutoff: Date): Promise<number>;
}

export const RETENTION_SINK = Symbol('RETENTION_SINK');

/**
 * Data-minimisation / storage-limitation (GDPR Art. 5(1)(e)) — Phase 38.
 * Unconverted seeker leads are anonymized after a retention window.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(@Inject(RETENTION_SINK) private readonly sink: RetentionSink) {}

  async purgeStaleLeads(retentionDays: number, now: Date = new Date()): Promise<number> {
    if (retentionDays <= 0) throw new Error('retentionDays must be positive');
    const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
    const n = await this.sink.anonymizeStaleLeadsBefore(cutoff);
    this.logger.log(`retention: anonymized ${n} stale leads older than ${cutoff.toISOString()}`);
    return n;
  }
}
