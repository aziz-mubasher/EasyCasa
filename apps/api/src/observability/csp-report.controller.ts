import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';

import { Public } from '../auth/public.decorator';

/**
 * CSP violation report sink — Phase 39 (Phase 6 shipped CSP in report-only mode;
 * this is where the reports land). Browsers POST violation reports here; we log
 * them (structured) so CSP can be tightened from report-only to enforcing with
 * evidence. Public + 204, best-effort. Rate-limit at the edge.
 */
@Controller('csp-report')
export class CspReportController {
  private readonly logger = new Logger('CSP');

  @Public()
  @Post()
  @HttpCode(204)
  report(@Body() body: unknown): void {
    const report = (body as { 'csp-report'?: unknown })?.['csp-report'] ?? body;
    this.logger.warn(`csp-violation ${JSON.stringify(report)}`);
  }
}
