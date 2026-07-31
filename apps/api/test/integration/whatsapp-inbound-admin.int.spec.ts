import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DRIZZLE } from '../../src/db/db.module';
import type { Db } from '../../src/db/drizzle';
import { adminAuditLog, waInboundMessages } from '../../src/db/schema';
import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';
import { asUser } from './test-auth';

const gate = dockerAvailable() ? describe : describe.skip;

const PII_BODY =
  'Call +39 333 999 8877 or mail seeker-pii@example.com — IBAN IT60X0542811101000000123456 CF RSSMRA85T10A562S';

gate('GET /admin/whatsapp/inbound (EC-19)', () => {
  let ctx: IntegrationContext;
  let db: Db;

  const withCap = asUser({
    sub: 'ec19-ops',
    email: 'ec19-ops@example.com',
    roles: ['admin', 'admin_operations'] as never,
  });
  const noCap = asUser({
    sub: 'ec19-buyer',
    email: 'ec19-buyer@example.com',
    roles: ['buyer'],
  });
  const bareAdmin = asUser({
    sub: 'ec19-bare-admin',
    email: 'ec19-bare@example.com',
    roles: ['admin'],
  });

  beforeAll(async () => {
    ctx = await startIntegration();
    db = ctx.app.get(DRIZZLE);
  }, 300_000);

  afterAll(async () => {
    await ctx?.stop();
  });

  beforeEach(async () => {
    await db.delete(waInboundMessages);
    await db.delete(adminAuditLog);
  });

  async function seedThread(opts: {
    waId: string;
    bodies: string[];
    receivedAt?: Date;
    windowExpiresAt?: Date;
    autoRepliedAt?: Date | null;
  }) {
    const base = opts.receivedAt ?? new Date('2026-07-31T10:00:00.000Z');
    const expires =
      opts.windowExpiresAt ?? new Date(base.getTime() + 24 * 60 * 60 * 1000);
    const ids: string[] = [];
    for (let i = 0; i < opts.bodies.length; i++) {
      const receivedAt = new Date(base.getTime() + i * 60_000);
      const rows = await db
        .insert(waInboundMessages)
        .values({
          providerMessageId: `wamid.ec19.${opts.waId}.${i}.${Math.random().toString(36).slice(2)}`,
          waId: opts.waId,
          phoneNumberId: 'pnid',
          messageType: 'text',
          body: opts.bodies[i]!,
          receivedAt,
          windowExpiresAt: expires,
          autoRepliedAt: i === 0 ? (opts.autoRepliedAt ?? null) : null,
        })
        .returning({ id: waInboundMessages.id });
      ids.push(rows[0]!.id);
    }
    return ids;
  }

  it('1. without capability → 403', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/admin/whatsapp/inbound')
      .set(noCap);
    expect(res.status).toBe(403);

    const detail = await request(ctx.app.getHttpServer())
      .get('/admin/whatsapp/inbound/393331112233')
      .set(bareAdmin);
    expect(detail.status).toBe(403);
  });

  it('2–3. with capability → grouped list; preview redacts PII', async () => {
    await seedThread({
      waId: '393331112233',
      bodies: [PII_BODY, 'second'],
      autoRepliedAt: new Date(),
    });
    await seedThread({
      waId: '393445556677',
      bodies: ['other thread'],
      receivedAt: new Date('2026-07-30T10:00:00.000Z'),
    });

    const res = await request(ctx.app.getHttpServer())
      .get('/admin/whatsapp/inbound')
      .set(withCap);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].waId).toBe('393331112233');
    expect(res.body.items[0].messageCount).toBe(2);
    expect(res.body.items[0].autoRepliedLast24h).toBe(true);

    const preview = JSON.stringify(res.body.items);
    expect(preview).not.toMatch(/333\s*999\s*8877/);
    expect(preview).not.toMatch(/seeker-pii@example\.com/i);
    expect(preview).not.toMatch(/IT60X0542811101000000123456/i);
    expect(preview).not.toMatch(/RSSMRA85T10A562S/i);
    expect(res.body.items[0].preview).toContain('[email]');
  });

  it('4. detail writes exactly one audit entry', async () => {
    await seedThread({ waId: '393331112233', bodies: ['a', 'b'] });
    const res = await request(ctx.app.getHttpServer())
      .get('/admin/whatsapp/inbound/393331112233')
      .set(withCap);
    expect(res.status).toBe(200);
    expect(res.body.messagesRevealed).toBe(2);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].body).toBe('a');

    const audits = await db.select().from(adminAuditLog);
    expect(audits).toHaveLength(1);
    expect(audits[0]!.action).toBe('whatsapp_inbound_reveal');
    expect(audits[0]!.resourceType).toBe('wa_inbound_thread');
    expect(audits[0]!.resourceId).toBe('393331112233');
    expect(audits[0]!.reason).toContain('revealed 2');
  });

  it('5. audit write failure → 500, no bodies', async () => {
    await seedThread({ waId: '393331112233', bodies: ['secret'] });

    const { AdminAuditService } = await import('../../src/authority/admin-audit.service');
    const audit = ctx.app.get(AdminAuditService);
    const spy = vi.spyOn(audit, 'record').mockRejectedValueOnce(new Error('db down'));

    const res = await request(ctx.app.getHttpServer())
      .get('/admin/whatsapp/inbound/393331112233')
      .set(withCap);
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secret');

    spy.mockRestore();
  });

  it('6. cursor pagination stable across identical received_at', async () => {
    const t = new Date('2026-07-31T11:00:00.000Z');
    // Two different wa_ids with same last_received_at
    await db.insert(waInboundMessages).values([
      {
        providerMessageId: 'wamid.same.a',
        waId: '390000000001',
        phoneNumberId: 'pnid',
        messageType: 'text',
        body: 'A',
        receivedAt: t,
        windowExpiresAt: new Date(t.getTime() + 86_400_000),
      },
      {
        providerMessageId: 'wamid.same.b',
        waId: '390000000002',
        phoneNumberId: 'pnid',
        messageType: 'text',
        body: 'B',
        receivedAt: t,
        windowExpiresAt: new Date(t.getTime() + 86_400_000),
      },
    ]);

    const page1 = await request(ctx.app.getHttpServer())
      .get('/admin/whatsapp/inbound?limit=1')
      .set(withCap);
    expect(page1.status).toBe(200);
    expect(page1.body.items).toHaveLength(1);
    expect(page1.body.nextCursor).toBeTruthy();

    const page2 = await request(ctx.app.getHttpServer())
      .get(`/admin/whatsapp/inbound?limit=1&cursor=${encodeURIComponent(page1.body.nextCursor)}`)
      .set(withCap);
    expect(page2.status).toBe(200);
    expect(page2.body.items).toHaveLength(1);
    expect(page2.body.items[0].waId).not.toBe(page1.body.items[0].waId);
  });

  it('9. empty table → empty items', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/admin/whatsapp/inbound')
      .set(withCap);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.nextCursor).toBeNull();
  });
});
