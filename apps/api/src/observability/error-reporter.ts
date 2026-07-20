import { Logger } from '@nestjs/common';

/**
 * Error-reporting seam — Phase 39. The exception filter depends on this, not on
 * Sentry directly, so error tracking is swappable and testable. Fail-soft: no
 * DSN → NoopErrorReporter (logs only), matching the seam pattern from P33/P36.
 */
export interface ErrorReporter {
  capture(error: unknown, context?: Record<string, unknown>): void;
}

export const ERROR_REPORTER = Symbol('ERROR_REPORTER');

export class NoopErrorReporter implements ErrorReporter {
  private readonly logger = new Logger('ErrorReporter');
  capture(error: unknown, context?: Record<string, unknown>): void {
    this.logger.error(
      `unreported error: ${String(error)} ${context ? JSON.stringify(context) : ''}`,
    );
  }
}
