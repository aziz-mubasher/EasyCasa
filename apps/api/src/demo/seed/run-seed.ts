import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../app.module';
import { resetConfigCache } from '../../config';
import { DemoListingSink } from './demo-listing.sink';
import { buildDemoListings } from './generate-listings';
import { DemoScenarioSeeder } from './seed-scenarios';

/**
 * CLI: deterministic demo inventory + staged scenarios (EC-15).
 *   DEMO_MODE=true DATABASE_URL=… ALLOW_PROVIDER_STUBS=true node dist/demo/seed/run-seed.js
 */
async function main(): Promise<void> {
  resetConfigCache();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const sink = app.get(DemoListingSink);
    const scenarios = app.get(DemoScenarioSeeder);
    await scenarios.wipe();
    const listings = buildDemoListings(120);
    const docs = [];
    for (const listing of listings) {
      const doc = await sink.upsert(listing);
      if (doc) docs.push(doc);
    }
    await sink.indexPublished(docs);
    const count = await sink.countDemo();
    const result = await scenarios.seed();
    // eslint-disable-next-line no-console
    console.log(`demo:seed ok — listings=${count} indexed=${docs.length}`, result.summary);
  } finally {
    await app.close();
  }
}
void main();
