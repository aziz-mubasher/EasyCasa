import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';
import { asUser } from './test-auth';

const gate = dockerAvailable() ? describe : describe.skip;

/** An authed route proves both global guards fire over the real composition root. */
gate('GET /me/enquiries (integration, authed)', () => {
  let ctx: IntegrationContext;
  beforeAll(async () => {
    ctx = await startIntegration();
  }, 300_000);
  afterAll(async () => {
    await ctx?.stop();
  });

  it('401s without a principal', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/me/enquiries');
    expect(res.status).toBe(401);
  });

  it('200s for an authenticated seeker', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/me/enquiries')
      .set(asUser({ sub: 'seeker-1', email: 'seeker@example.it', roles: ['buyer'] }));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
