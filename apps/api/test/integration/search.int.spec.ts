import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';

const gate = dockerAvailable() ? describe : describe.skip;

/** A @Public discovery route must serve anonymous callers over the real stack. */
gate('POST /search/bounds (integration, public)', () => {
  let ctx: IntegrationContext;
  beforeAll(async () => {
    ctx = await startIntegration();
  }, 300_000);
  afterAll(async () => {
    await ctx?.stop();
  });

  it('returns results without auth (guard opt-out works end to end)', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/search/bounds')
      .send({
        minLat: 45.4,
        minLng: 9.1,
        maxLat: 45.5,
        maxLng: 9.3,
        zoom: 12,
      });
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(Array.isArray(res.body.pins) || Array.isArray(res.body.clusters)).toBe(true);
  });
});
