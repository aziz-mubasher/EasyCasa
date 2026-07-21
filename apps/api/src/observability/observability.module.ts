import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { apiConfig } from '../config';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { CspReportController } from './csp-report.controller';
import { ERROR_REPORTER, NoopErrorReporter } from './error-reporter';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { RequestIdMiddleware } from './request-id.middleware';
import { SentryErrorReporter } from './sentry-error-reporter';
import { throttlerRoot } from './throttling';

/**
 * Observability module — Phase 39 / 39.1.
 * Wires request-id, metrics interceptor + /metrics, exception filter, CSP sink,
 * and throttling. ReadinessController + HEALTH indicators live at the
 * composition root (39.1) so stub/real indicators share scope with the
 * readiness endpoint.
 */
@Module({
  imports: [throttlerRoot],
  controllers: [MetricsController, CspReportController],
  providers: [
    {
      provide: ERROR_REPORTER,
      useFactory: async () => {
        if (!apiConfig.SENTRY_DSN) return new NoopErrorReporter();
        const Sentry = await import('@sentry/node');
        return new SentryErrorReporter(Sentry);
      },
    },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [ERROR_REPORTER],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
