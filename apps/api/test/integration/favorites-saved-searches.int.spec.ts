import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PilotSeedService } from '../../src/pilot/pilot.module';
import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';
import { asUser } from './test-auth';

/**
 * K EC 1.36 — favorites + saved searches read/write (existing endpoints).
 */
const gate = dockerAvailable() ? describe : describe.skip;

gate('Favorites and saved searches (integration)', () => {
  let ctx: IntegrationContext;

  const seeker = asUser({
    sub: 'fav-seeker-1',
    email: 'fav-seeker@example.it',
    name: 'Fav Seeker',
    roles: ['buyer'],
  });

  beforeAll(async () => {
    ctx = await startIntegration();
    const seed = ctx.app.get(PilotSeedService);
    await seed.run();
  }, 300_000);

  afterAll(async () => {
    await ctx?.stop();
  });

  const api = () => ctx.app.getHttpServer();

  it('GET /me/favorites returns listing summaries; POST/DELETE toggle', async () => {
    const search = await request(api())
      .post('/search/bounds')
      .send({ minLat: 45.4, minLng: 9.1, maxLat: 45.5, maxLng: 9.3, zoom: 12 });
    expect(search.status).toBe(201);
    const listingId = search.body.pins?.[0]?.listingId as string;
    expect(listingId).toBeTruthy();

    const empty = await request(api()).get('/me/favorites').set(seeker);
    expect(empty.status).toBe(200);
    expect(Array.isArray(empty.body)).toBe(true);

    await request(api()).put(`/me/favorites/${listingId}`).set(seeker).expect((res) => {
      expect([200, 201]).toContain(res.status);
    });

    const withOne = await request(api()).get('/me/favorites').set(seeker);
    expect(withOne.status).toBe(200);
    expect(withOne.body.some((r: { id: string }) => r.id === listingId)).toBe(true);
    expect(withOne.body[0]).toMatchObject({ slug: expect.any(String), title: expect.any(String) });

    await request(api()).delete(`/me/favorites/${listingId}`).set(seeker).expect(200);

    const after = await request(api()).get('/me/favorites').set(seeker);
    expect(after.body.some((r: { id: string }) => r.id === listingId)).toBe(false);
  });

  it('POST/GET/PUT/DELETE saved searches with webParams round-trip', async () => {
    const created = await request(api())
      .post('/me/saved-searches')
      .set(seeker)
      .send({
        name: 'Bilocali a Brescia, fino a €120.000',
        frequency: 'off',
        criteria: {
          filters: { dealType: 'sale', priceMaxCents: 12_000_000 },
          webParams: {
            transactionType: 'sale',
            provinceSlug: 'BS',
            maxPrice: '120000',
            minBedrooms: '2',
          },
        },
      });
    expect(created.status).toBe(201);
    const id = created.body.id as string;

    const list = await request(api()).get('/me/saved-searches').set(seeker);
    expect(list.status).toBe(200);
    const row = list.body.find((r: { id: string }) => r.id === id);
    expect(row?.criteria?.webParams?.provinceSlug).toBe('BS');

    await request(api())
      .put(`/me/saved-searches/${id}/frequency`)
      .set(seeker)
      .send({ frequency: 'daily' })
      .expect(200);

    await request(api()).delete(`/me/saved-searches/${id}`).set(seeker).expect(200);
  });
});
