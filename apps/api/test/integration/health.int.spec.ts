import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';

const gate = dockerAvailable() ? describe : describe.skip;

gate('GET /health (integration)', () => {
  let ctx: IntegrationContext;
  beforeAll(async () => {
    ctx = await startIntegration();
  }, 300_000);
  afterAll(async () => {
    await ctx?.stop();
  });

  it('is public and reports seam status', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.seams)).toBe(true);
    const byName = Object.fromEntries(
      (res.body.seams as Array<{ name: string; configured: boolean }>).map((s) => [
        s.name,
        s.configured,
      ]),
    );
    expect(byName.psp).toBe(false);
    expect(byName.meili).toBe(true);
  });
});
