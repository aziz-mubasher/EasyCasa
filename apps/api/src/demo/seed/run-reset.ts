import { NestFactory } from '@nestjs/core';
import { eq, sql } from 'drizzle-orm';

import { AppModule } from '../../app.module';
import { resetConfigCache } from '../../config';
import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { listings } from '../../db/schema';
import { DemoListingSink } from './demo-listing.sink';
import { buildDemoListings } from './generate-listings';
import { DemoScenarioSeeder } from './seed-scenarios';

/**
 * CLI: wipe demo listings + scenarios and re-seed (EC-15).
 * Full DB wipe: `./infra/demo/down.sh --volumes`.
 */
async function main(): Promise<void> {
  resetConfigCache();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const db = app.get(DRIZZLE) as Db;
    const scenarios = app.get(DemoScenarioSeeder);
    const sink = app.get(DemoListingSink);

    await scenarios.wipe();
    await db.delete(listings).where(eq(listings.source, 'demo'));

    const rows = buildDemoListings(120);
    for (const listing of rows) {
      await sink.upsert(listing);
    }
    const result = await scenarios.seed();

    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(listings)
      .where(eq(listings.source, 'demo'));
    // eslint-disable-next-line no-console
    console.log(`demo:reset ok — demo listings=${c}`, result.summary);
  } finally {
    await app.close();
  }
}
void main();
