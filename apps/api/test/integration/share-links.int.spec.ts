import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PilotSeedService } from '../../src/pilot/pilot.module';
import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';
import { asUser } from './test-auth';

const gate = dockerAvailable() ? describe : describe.skip;

gate('SmartLink share links (real DB)', () => {
  let ctx: IntegrationContext;
  let listingId: string;

  beforeAll(async () => {
    ctx = await startIntegration();
    const seed = ctx.app.get(PilotSeedService);
    await seed.run();

    const search = await request(ctx.app.getHttpServer())
      .post('/search/bounds')
      .send({ minLat: 45.4, minLng: 9.1, maxLat: 45.5, maxLng: 9.3, zoom: 12 });
    listingId = search.body.pins?.[0]?.listingId as string;
  }, 300_000);

  afterAll(async () => {
    await ctx?.stop();
  });

  const api = () => ctx.app.getHttpServer();

  const owner = () =>
    asUser({
      sub: 'pilot-owner',
      email: 'agente@easycasaita.com',
      name: 'Agenzia EasyCasa',
      roles: ['agent'],
    });

  it('creates, serves public payload, tracks views, and revokes', async () => {
    const created = await request(api())
      .post(`/listings/${listingId}/share-links`)
      .set(owner())
      .send({ includeValuationBand: true })
      .expect(201);

    expect(created.body.token).toBeTruthy();
    expect(created.body.publicPath).toMatch(/^\/s\//);
    const token = created.body.token as string;

    const pub = await request(api()).get(`/share/${token}`).expect(200);
    expect(pub.body.listing.title).toBeTruthy();
    expect(pub.body.listing.address).toBeUndefined();
    expect(pub.body.agent.displayName).toBeTruthy();

    await request(api())
      .post(`/share/${token}/view`)
      .send({ visitorToken: 'visitor-abc-12345678' })
      .expect((res) => expect([200, 201]).toContain(res.status));
    await request(api())
      .post(`/share/${token}/view`)
      .send({ visitorToken: 'visitor-abc-12345678' })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const after = await request(api()).get(`/share/${token}`).expect(200);
    expect(after.body.viewCount).toBeGreaterThanOrEqual(2);
    expect(after.body.uniqueViewCount).toBe(1);

    const stranger = asUser({ sub: 'other', roles: ['agent'] });
    await request(api()).post(`/listings/${listingId}/share-links`).set(stranger).expect(403);

    await request(api())
      .post(`/share-links/${created.body.id}/revoke`)
      .set(owner())
      .expect((res) => expect([200, 201]).toContain(res.status));
    await request(api()).get(`/share/${token}`).expect(410);
  });
});
