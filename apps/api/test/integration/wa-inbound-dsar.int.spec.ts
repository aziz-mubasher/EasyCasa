import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DRIZZLE } from '../../src/db/db.module';
import type { Db } from '../../src/db/drizzle';
import { users, waInboundMessages } from '../../src/db/schema';
import { WaInboundDataSource } from '../../src/privacy/sources/wa-inbound.data-source';
import { toWaId } from '../../src/whatsapp/phone';
import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';

const gate = dockerAvailable() ? describe : describe.skip;

gate('EC-19b DSAR phone_e164 ↔ wa_id match (integration)', () => {
  let ctx: IntegrationContext;
  let db: Db;
  let src: WaInboundDataSource;

  beforeAll(async () => {
    ctx = await startIntegration();
    db = ctx.app.get(DRIZZLE);
    src = new WaInboundDataSource(db);
  }, 300_000);

  afterAll(async () => {
    await ctx?.stop();
  });

  async function seedUser(phone: string): Promise<string> {
    const phoneE164 = toWaId(phone);
    const inserted = await db
      .insert(users)
      .values({
        email: `dsar-${Date.now()}-${Math.random().toString(16).slice(2)}@example.it`,
        displayName: 'DSAR Test',
        role: 'buyer',
        phone,
        phoneE164,
      })
      .returning({ id: users.id });
    return inserted[0]!.id;
  }

  async function seedInbound(waId: string, providerMessageId: string): Promise<void> {
    const now = new Date();
    await db.insert(waInboundMessages).values({
      providerMessageId,
      waId,
      waHandle: `h-${providerMessageId}`,
      phoneNumberId: 'pnid',
      messageType: 'text',
      body: 'hello',
      receivedAt: now,
      windowExpiresAt: new Date(now.getTime() + 24 * 3600_000),
    });
  }

  it('export returns message for mobile phone stored with spaces/+', async () => {
    const userId = await seedUser('+39 333 1234567');
    await seedInbound('393331234567', `wamid.mobile.${userId}`);
    const out = await src.collect(userId);
    expect(out.records).toHaveLength(1);
    expect(out.records[0]).toMatchObject({ body: 'hello' });
  });

  it('export returns message for Italian landline (trunk zero preserved)', async () => {
    const userId = await seedUser('+39 02 1234567');
    expect(toWaId('+39 02 1234567')).toBe('39021234567');
    await seedInbound('39021234567', `wamid.land.${userId}`);
    const out = await src.collect(userId);
    expect(out.records).toHaveLength(1);
  });

  it('erasure removes rows; re-export empty', async () => {
    const userId = await seedUser('3339876543');
    const waId = toWaId('3339876543')!;
    await seedInbound(waId, `wamid.erase.${userId}`);
    const erased = await src.erase(userId);
    expect(erased.erased).toBe(1);
    const again = await src.collect(userId);
    expect(again.records).toHaveLength(0);
    const direct = await db
      .select({ id: waInboundMessages.id })
      .from(waInboundMessages)
      .where(eq(waInboundMessages.waId, waId));
    expect(direct).toHaveLength(0);
  });

  it('genuinely empty subject: export empty AND table empty for that wa_id', async () => {
    const userId = await seedUser('+39 333 0000001');
    const waId = toWaId('+39 333 0000001')!;
    const out = await src.collect(userId);
    expect(out.records).toHaveLength(0);
    const direct = await db
      .select({ id: waInboundMessages.id })
      .from(waInboundMessages)
      .where(eq(waInboundMessages.waId, waId));
    expect(direct).toHaveLength(0);
  });

  it('unparseable phone → phone_e164 null, no throw on insert path', async () => {
    const inserted = await db
      .insert(users)
      .values({
        email: `dsar-bad-${Date.now()}@example.it`,
        role: 'buyer',
        phone: 'abc',
        phoneE164: toWaId('abc'),
      })
      .returning({ id: users.id, phoneE164: users.phoneE164 });
    expect(inserted[0]?.phoneE164).toBeNull();
  });

  it('phone change updates phone_e164', async () => {
    const userId = await seedUser('+39 333 1111111');
    const next = '+39 333 2222222';
    await db
      .update(users)
      .set({ phone: next, phoneE164: toWaId(next), updatedAt: new Date() })
      .where(eq(users.id, userId));
    const rows = await db
      .select({ phoneE164: users.phoneE164 })
      .from(users)
      .where(eq(users.id, userId));
    expect(rows[0]?.phoneE164).toBe('393332222222');
  });
});
