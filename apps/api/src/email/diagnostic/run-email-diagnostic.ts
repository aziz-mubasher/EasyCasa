import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../app.module';
import { apiConfig, resetConfigCache } from '../../config';
import { EmailService } from '../email.service';
import {
  formatEmailDiagnosticLines,
  resolveDiagnosticRecipient,
  runEmailDiagnostic,
} from './email-diagnostic';

/**
 * CLI entry: report email provider config and optionally send a test message.
 *
 *   EMAIL_DIAGNOSTIC_TO=ops@example.com node dist/email/diagnostic/run-email-diagnostic.js
 *   node dist/email/diagnostic/run-email-diagnostic.js ops@example.com
 *
 * Exits 1 when the active provider is noop or a test send fails (deploy gate).
 */
async function main(): Promise<void> {
  resetConfigCache();
  const recipient = resolveDiagnosticRecipient(process.argv, process.env);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const email = app.get(EmailService);
    const outcome = await runEmailDiagnostic(
      {
        config: apiConfig,
        sendTest: (to) => email.sendDiagnosticTest(to),
      },
      recipient,
    );

    for (const line of formatEmailDiagnosticLines(outcome)) {
      console.log(line);
    }
    process.exit(outcome.exitCode);
  } finally {
    await app.close();
  }
}

void main().catch((err) => {
  console.error('email diagnostic failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
