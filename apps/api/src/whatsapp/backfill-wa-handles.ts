/**
 * EC-19a — backfill wa_handle on wa_inbound_messages.
 *
 * Application-side HMAC only — do not use pgcrypto hmac() (secret would land in
 * pg_stat_statements). Idempotent: skips rows that already have wa_handle.
 *
 * Usage (from apps/api, with DATABASE_URL + WA_HANDLE_SECRET set):
 *   pnpm exec tsx src/whatsapp/backfill-wa-handles.ts
 */
import { eq, isNull } from 'drizzle-orm';

import { loadApiConfig, resetConfigCache } from '../config';
import { getDb, resetDbConnection } from '../db/drizzle';
import { waInboundMessages } from '../db/schema';
import { waHandleFor } from './wa-handle';

async function main(): Promise<void> {
  resetConfigCache();
  await resetDbConnection();
  const config = loadApiConfig();
  const db = getDb();

  const pending = await db
    .select({ id: waInboundMessages.id, waId: waInboundMessages.waId })
    .from(waInboundMessages)
    .where(isNull(waInboundMessages.waHandle));

  let updated = 0;
  for (const row of pending) {
    const handle = waHandleFor(row.waId, config.WA_HANDLE_SECRET);
    await db
      .update(waInboundMessages)
      .set({ waHandle: handle })
      .where(eq(waInboundMessages.id, row.id));
    updated += 1;
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ pending: pending.length, updated }));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
