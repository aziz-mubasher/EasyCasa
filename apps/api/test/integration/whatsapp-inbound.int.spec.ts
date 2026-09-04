import { createHmac } from 'node:crypto';

import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_CONFIG } from '../../src/config/config.module';
import { DRIZZLE } from '../../src/db/db.module';
import type { Db } from '../../src/db/drizzle';
import { waContacts, waInboundMessages } from '../../src/db/schema';
import { EmailService } from '../../src/email/email.service';
import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';

const SECRET = 'int-test-wa-secret';
const gate = dockerAvailable() ? describe : describe.skip;

function sign(raw: Buffer): string {
  return `sha256=${createHmac('sha256', SECRET).update(raw).digest('hex')}`;
}

function textPayload(opts: {
  id: string;
  from?: string;
  body?: string;
  type?: string;
  statuses?: Array<{ id: string; status: string }>;
}) {
  const ts = String(Math.floor(Date.now() / 1000));
  const message: Record<string, unknown> = {
    id: opts.id,
    from: opts.from ?? '393331112233',
    timestamp: ts,
    type: opts.type ?? 'text',
  };
  if ((opts.type ?? 'text') === 'text') {
    message.text = { body: opts.body ?? 'Ciao, vorrei info' };
  }
  const value: Record<string, unknown> = {
    metadata: { phone_number_id: 'int-pnid' },
    messages: [message],
  };
  if (opts.statuses) value.statuses = opts.statuses;
  return {
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ value }] }],
  };
}

gate('POST /whatsapp/webhook inbound (EC-17 integration)', () => {
  let ctx: IntegrationContext;
  let db: Db;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    ctx = await startIntegration();
    db = ctx.app.get(DRIZZLE);
    expect(ctx.app.get(APP_CONFIG).WHATSAPP_APP_SECRET).toBe(SECRET);
  }, 300_000);

  afterAll(async () => {
    vi.unstubAllGlobals();
    await ctx?.stop();
  });

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.reply' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  async function post(payload: unknown, signature?: string) {
    const raw = Buffer.from(JSON.stringify(payload), 'utf8');
    return request(ctx.app.getHttpServer())
      .post('/whatsapp/webhook')
      .type('application/json')
      .set('x-hub-signature-256', signature ?? sign(raw))
      .send(raw.toString('utf8'));
  }

  async function countRows(providerMessageId?: string): Promise<number> {
    if (providerMessageId) {
      const rows = await db
        .select()
        .from(waInboundMessages)
        .where(eq(waInboundMessages.providerMessageId, providerMessageId));
      return rows.length;
    }
    const rows = await db.select().from(waInboundMessages);
    return rows.length;
  }

  it('1. valid signature + messages → 200, one row, auto-reply attempted', async () => {
    const before = await countRows();
    const payload = textPayload({ id: 'wamid.ec17.1', body: 'Vorrei visitare' });
    const res = await post(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });

    // after-persist is fire-and-forget
    await vi.waitFor(async () => {
      expect(await countRows('wamid.ec17.1')).toBe(1);
      expect(fetchMock).toHaveBeenCalled();
    }, { timeout: 5000 });

    const rows = await db
      .select()
      .from(waInboundMessages)
      .where(eq(waInboundMessages.providerMessageId, 'wamid.ec17.1'));
    expect(rows[0]!.autoRepliedAt).not.toBeNull();
    expect(await countRows()).toBe(before + 1);
  });

  it('2. invalid signature → 403, zero new rows, zero sends', async () => {
    const before = await countRows();
    fetchMock.mockClear();
    const payload = textPayload({ id: 'wamid.ec17.forged' });
    const res = await post(payload, 'sha256=00'.padEnd(71, '0'));
    expect(res.status).toBe(403);
    expect(await countRows()).toBe(before);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('4. same provider_message_id twice → one row, one send', async () => {
    fetchMock.mockClear();
    const payload = textPayload({ id: 'wamid.ec17.dup', body: 'dup' });
    expect((await post(payload)).status).toBe(200);
    await vi.waitFor(async () => {
      expect(await countRows('wamid.ec17.dup')).toBe(1);
      expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    });
    const sendsAfterFirst = fetchMock.mock.calls.length;

    expect((await post(payload)).status).toBe(200);
    await new Promise((r) => setTimeout(r, 200));
    expect(await countRows('wamid.ec17.dup')).toBe(1);
    expect(fetchMock.mock.calls.length).toBe(sendsAfterFirst);
  });

  it('5. two messages same wa_id → two rows, one auto-reply', async () => {
    fetchMock.mockClear();
    const from = '393399998888';
    expect((await post(textPayload({ id: 'wamid.ec17.a', from, body: 'one' }))).status).toBe(200);
    await vi.waitFor(
      async () => {
        expect(await countRows('wamid.ec17.a')).toBe(1);
        const contacts = await db.select().from(waContacts).where(eq(waContacts.waId, from));
        expect(contacts[0]?.lastLanguagePromptAt).toBeTruthy();
      },
      { timeout: 8000 },
    );
    const sendsAfterFirst = fetchMock.mock.calls.length;
    expect(sendsAfterFirst).toBeGreaterThan(0);

    expect((await post(textPayload({ id: 'wamid.ec17.b', from, body: 'two' }))).status).toBe(200);
    await vi.waitFor(async () => expect(await countRows('wamid.ec17.b')).toBe(1));
    await new Promise((r) => setTimeout(r, 300));

    expect(fetchMock.mock.calls.length).toBe(sendsAfterFirst); // language cooldown — one journey send
  });

  it('6. statuses-only → no inbound row', async () => {
    const before = await countRows();
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: 'int-pnid' },
                statuses: [{ id: 'wamid.status.only', status: 'delivered' }],
              },
            },
          ],
        },
      ],
    };
    expect((await post(payload)).status).toBe(200);
    expect(await countRows()).toBe(before);
  });

  it('7. combined statuses + messages → both handled', async () => {
    const payload = textPayload({
      id: 'wamid.ec17.combo',
      body: 'combo',
      statuses: [{ id: 'wamid.out.combo', status: 'read' }],
    });
    expect((await post(payload)).status).toBe(200);
    await vi.waitFor(async () => expect(await countRows('wamid.ec17.combo')).toBe(1));
  });

  it('8. stop-word → row, no auto-reply', async () => {
    fetchMock.mockClear();
    const payload = textPayload({ id: 'wamid.ec17.stop', from: '393300001111', body: 'BASTA' });
    expect((await post(payload)).status).toBe(200);
    await vi.waitFor(async () => expect(await countRows('wamid.ec17.stop')).toBe(1));
    await new Promise((r) => setTimeout(r, 300));
    const rows = await db
      .select()
      .from(waInboundMessages)
      .where(eq(waInboundMessages.providerMessageId, 'wamid.ec17.stop'));
    expect(rows[0]!.autoRepliedAt).toBeNull();
    const textSends = fetchMock.mock.calls.filter((c) => {
      const body = JSON.parse(String(c[1]?.body ?? '{}'));
      return body.type === 'text';
    });
    expect(textSends).toHaveLength(0);
  });

  it('9. media → type set, body null', async () => {
    const payload = textPayload({ id: 'wamid.ec17.media', type: 'image', from: '393322221111' });
    expect((await post(payload)).status).toBe(200);
    await vi.waitFor(async () => expect(await countRows('wamid.ec17.media')).toBe(1));
    const rows = await db
      .select()
      .from(waInboundMessages)
      .where(eq(waInboundMessages.providerMessageId, 'wamid.ec17.media'));
    expect(rows[0]!.messageType).toBe('image');
    expect(rows[0]!.body).toBeNull();
  });

  it('10. mail failure still returns 200 and sets forward_error', async () => {
    const email = ctx.app.get(EmailService);
    const spy = vi.spyOn(email, 'sendText').mockRejectedValue(new Error('smtp down'));
    try {
      const payload = textPayload({ id: 'wamid.ec17.mail', from: '393344443333', body: 'mail me' });
      expect((await post(payload)).status).toBe(200);
      await vi.waitFor(async () => {
        const rows = await db
          .select()
          .from(waInboundMessages)
          .where(eq(waInboundMessages.providerMessageId, 'wamid.ec17.mail'));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.forwardError).toBeTruthy();
      }, { timeout: 8000 });
    } finally {
      spy.mockRestore();
    }
  });
});
