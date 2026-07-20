import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { HealthIndicatorRegistry } from '../health/health-indicator.registry';
import { MeiliHealthIndicator } from '../health/meili.health';
import { PostgresHealthIndicator } from '../health/postgres.health';
import { ReadinessController } from '../health/readiness.controller';
import { RedisHealthIndicator } from '../health/redis.health';
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
 * Observability module — Phase 39. Wires: request-id correlation (all routes),
 * the metrics interceptor + /metrics, the global exception filter + error
 * reporter, /health/live + /health/ready, throttling, and the CSP report sink.
 *
 * ERROR_REPORTER defaults to fail-soft noop; when SENTRY_DSN is set (and Sentry
 * is inited in main.ts), the factory binds SentryErrorReporter.
 */
@Module({
  imports: [throttlerRoot],
  controllers: [MetricsController, ReadinessController, CspReportController],
  providers: [
    HealthIndicatorRegistry,
    PostgresHealthIndicator,
    MeiliHealthIndicator,
    RedisHealthIndicator,
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
  exports: [ERROR_REPORTER, HealthIndicatorRegistry],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
