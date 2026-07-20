import type { ErrorReporter } from './error-reporter';

/**
 * Sentry adapter — Phase 39. Thin wrapper so @sentry/node stays at the edge of
 * the app. Construct only when a DSN is configured (see ObservabilityModule).
 * `sentry` is injected (the initialized @sentry/node module) to keep this
 * testable and avoid a hard import where Sentry isn't installed.
 */
export interface SentryLike {
  captureException(error: unknown, hint?: { extra?: Record<string, unknown> }): void;
}

export class SentryErrorReporter implements ErrorReporter {
  constructor(private readonly sentry: SentryLike) {}
  capture(error: unknown, context?: Record<string, unknown>): void {
    this.sentry.captureException(error, context ? { extra: context } : undefined);
  }
}
