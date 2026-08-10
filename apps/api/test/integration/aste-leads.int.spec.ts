import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';

import { DRIZZLE } from '../../src/db/db.module';
import type { Db } from '../../src/db/drizzle';
import { asteLeads } from '../../src/db/schema';
import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';

const gate = dockerAvailable() ? describe : describe.skip;

gate('POST /aste/leads (integration)', () => {
  let ctx: IntegrationContext;
  let db: Db;

  beforeAll(async () => {
    ctx = await startIntegration();
    db = ctx.app.get(DRIZZLE);
  }, 300_000);

  afterAll(async () => {
    await ctx?.stop();
  });

  const api = () => ctx.app.getHttpServer();

  const baseBody = {
    email: 'aste-lead@example.it',
    language: 'it' as const,
    locale: 'it' as const,
    consent: true as const,
    province: 'MI',
    buyerType: 'prima_casa' as const,
  };

  it('persists a valid signup and returns a guide URL', async () => {
    const res = await request(api()).post('/aste/leads').send(baseBody);
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.guideUrl).toMatch(/\/it\/aste\/guida\?t=/);
    expect(res.body.duplicate).toBe(false);

    const rows = await db
      .select()
      .from(asteLeads)
      .where(sql`lower(${asteLeads.email}) = ${baseBody.email}`);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.consent).toBe(true);
    expect(rows[0]!.province).toBe('MI');
  });

  it('rejects consent=false with 4xx', async () => {
    const res = await request(api())
      .post('/aste/leads')
      .send({ ...baseBody, email: 'noconsent@example.it', consent: false });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);

    const rows = await db
      .select()
      .from(asteLeads)
      .where(sql`lower(${asteLeads.email}) = ${'noconsent@example.it'}`);
    expect(rows).toHaveLength(0);
  });

  it('handles duplicate email idempotently', async () => {
    const first = await request(api())
      .post('/aste/leads')
      .send({ ...baseBody, email: 'dup-aste@example.it' });
    expect([200, 201]).toContain(first.status);
    const token = new URL(first.body.guideUrl as string).searchParams.get('t');

    const second = await request(api())
      .post('/aste/leads')
      .send({
        ...baseBody,
        email: 'dup-aste@example.it',
        language: 'en',
        locale: 'en',
        province: 'BS',
      });
    expect([200, 201]).toContain(second.status);
    expect(second.body.duplicate).toBe(true);
    expect(second.body.guideUrl).toContain(token);

    const rows = await db
      .select()
      .from(asteLeads)
      .where(sql`lower(${asteLeads.email}) = ${'dup-aste@example.it'}`);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.language).toBe('en');
    expect(rows[0]!.province).toBe('BS');
  });

  it('resolves guide token and 404s unknowns', async () => {
    const created = await request(api())
      .post('/aste/leads')
      .send({ ...baseBody, email: 'guide-token@example.it' });
    const token = new URL(created.body.guideUrl as string).searchParams.get('t')!;

    const ok = await request(api()).get(`/aste/guide/${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.language).toBe('it');

    const missing = await request(api()).get('/aste/guide/not-a-real-token-zzzzzzzz');
    expect(missing.status).toBe(404);

    // Cleanup uniqueness noise for re-runs in shared DB is unnecessary (fresh container).
    await db.delete(asteLeads).where(eq(asteLeads.guideToken, token));
  });
});
