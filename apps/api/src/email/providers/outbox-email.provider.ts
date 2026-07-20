import { Logger } from '@nestjs/common';

import type { EmailMessage, EmailPort, EmailResult } from '../email-port';

export interface OutboxEntry {
  at: Date;
  message: EmailMessage;
  result: EmailResult;
}

/** DI token for the outbox wrapper (same instance as EMAIL_PORT). */
export const EMAIL_OUTBOX = Symbol('EMAIL_OUTBOX');

/**
 * Outbox provider — Phase 37 (seeker pilot).
 *
 * Wraps a real delegate port and records every send in a bounded in-memory ring
 * so a pilot operator can audit exactly what went out and so journey tests can
 * assert side-effects. Delegation is best-effort: if the delegate throws, the
 * attempt is still recorded with a non-delivered result.
 */
export class OutboxEmailProvider implements EmailPort {
  private readonly logger = new Logger('EmailOutbox');
  private readonly entries: OutboxEntry[] = [];

  constructor(
    private readonly delegate: EmailPort,
    private readonly capacity = 500,
  ) {}

  async send(msg: EmailMessage): Promise<EmailResult> {
    let result: EmailResult;
    try {
      result = await this.delegate.send(msg);
    } catch (err) {
      this.logger.error(`delegate send failed: ${String(err)}`);
      result = { provider: 'noop', delivered: false };
    }
    this.record({ at: new Date(), message: msg, result });
    return result;
  }

  private record(entry: OutboxEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.capacity) this.entries.shift();
  }

  /** Most-recent-last snapshot (optionally filtered by recipient). */
  list(toFilter?: string): OutboxEntry[] {
    return toFilter ? this.entries.filter((e) => e.message.to === toFilter) : [...this.entries];
  }

  clear(): void {
    this.entries.length = 0;
  }
}
