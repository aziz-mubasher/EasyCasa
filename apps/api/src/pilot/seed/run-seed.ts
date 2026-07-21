import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../app.module';
import { resetConfigCache } from '../../config';
import { DrizzleListingSink } from '../seed/drizzle-listing.sink';
import { runSeed } from './seed-cli';

/**
 * CLI entry: seed pilot listings into the live Drizzle + Meili sink.
 *   DATABASE_URL=… DEV_AUTH=true node dist/pilot/seed/run-seed.js
 */
async function main(): Promise<void> {
  resetConfigCache();
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const sink = app.get(DrizzleListingSink);
    await runSeed(() => sink);
  } finally {
    await app.close();
  }
}
void main();
