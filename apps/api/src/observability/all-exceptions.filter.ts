import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';

import { ERROR_REPORTER, type ErrorReporter } from './error-reporter';

type JsonResponder = {
  status: (code: number) => { json: (body: unknown) => void };
};

/**
 * Global exception filter — Phase 39. Turns any thrown error into a consistent
 * JSON envelope, attaches the request id for correlation, and reports 5xx to the
 * error reporter (Sentry in prod). 4xx are client errors and are NOT reported
 * (they'd drown real incidents). Never leaks internals on a 500.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');
  constructor(@Inject(ERROR_REPORTER) private readonly reporter: ErrorReporter) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<JsonResponder>();
    const req = ctx.getRequest<{ id?: string; url?: string; method?: string }>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    if (status >= 500 && status !== HttpStatus.SERVICE_UNAVAILABLE) {
      this.reporter.capture(exception, { url: req.url, method: req.method, requestId: req.id });
      this.logger.error(`${req.method} ${req.url} → ${status}: ${String(exception)}`);
    }

    const errorBody =
      typeof message === 'string'
        ? message
        : ((message as { message?: unknown }).message ?? message);

    res.status(status).json({
      statusCode: status,
      error: errorBody,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  }
}
