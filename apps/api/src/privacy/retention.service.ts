import { Inject, Injectable, Logger } from '@nestjs/common';

/** Storage seam for retention — real impl anonymizes rows; tests use in-memory. */
export interface RetentionSink {
  /** Anonymize unconverted seeker leads older than the cutoff; return count. */
  anonymizeStaleLeadsBefore(cutoff: Date): Promise<number>;
  /** EC-17 — hard-delete WhatsApp inbound rows older than the cutoff. */
  purgeWaInboundBefore(cutoff: Date): Promise<number>;
}

export const RETENTION_SINK = Symbol('RETENTION_SINK');

/**
 * Data-minimisation / storage-limitation (GDPR Art. 5(1)(e)) — Phase 38 + EC-17.
 * Unconverted seeker leads are anonymized after a retention window.
 * WhatsApp inbound rows are deleted after WA_INBOUND_RETENTION_DAYS (counsel to confirm).
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

  async purgeWaInbound(retentionDays: number, now: Date = new Date()): Promise<number> {
    if (retentionDays <= 0) throw new Error('retentionDays must be positive');
    const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
    const n = await this.sink.purgeWaInboundBefore(cutoff);
    this.logger.log(
      `retention: purged ${n} wa_inbound_messages older than ${cutoff.toISOString()}`,
    );
    return n;
  }
}
