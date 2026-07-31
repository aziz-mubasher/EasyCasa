/**
 * EC-19b — backfill users.phone_e164 from users.phone via toWaId().
 *
 * Logs counts only — never phone values.
 *
 * Usage (from apps/api, with DATABASE_URL set):
 *   pnpm exec tsx src/whatsapp/backfill-phone-e164.ts
 */
import { eq, isNull } from 'drizzle-orm';

import { loadApiConfig, resetConfigCache } from '../config';
import { getDb, resetDbConnection } from '../db/drizzle';
import { users } from '../db/schema';
import { toWaId } from './phone';

async function main(): Promise<void> {
  resetConfigCache();
  await resetDbConnection();
  loadApiConfig();
  const db = getDb();

  const pending = await db
    .select({ id: users.id, phone: users.phone })
    .from(users)
    .where(isNull(users.phoneE164));

  let updated = 0;
  let nulls = 0;
  for (const row of pending) {
    const phoneE164 = toWaId(row.phone);
    if (phoneE164 == null) nulls += 1;
    await db
      .update(users)
      .set({ phoneE164, updatedAt: new Date() })
      .where(eq(users.id, row.id));
    updated += 1;
  }

  console.log(JSON.stringify({ processed: pending.length, updated, nulls }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
