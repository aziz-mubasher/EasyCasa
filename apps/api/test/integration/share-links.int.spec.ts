import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';
import { asUser } from './test-auth';

const gate = dockerAvailable() ? describe : describe.skip;

gate('SmartLink share links (integration)', () => {
  let ctx: IntegrationContext;

  beforeAll(async () => {
    ctx = await startIntegration();
  }, 300_000);

  afterAll(async () => {
    await ctx?.stop();
  });

  const api = () => ctx.app.getHttpServer();

  it('creates, tracks views, hides private fields, and revokes', async () => {
    const agent = asUser({
      sub: 'smartlink-agent',
      email: 'smartlink-agent@example.it',
      name: 'Agente SmartLink',
      roles: ['agent'],
    });
    const stranger = asUser({
      sub: 'smartlink-stranger',
      email: 'stranger@example.it',
      roles: ['seller'],
    });

    const createListing = await request(api())
      .post('/listings')
      .set(agent)
      .send({
        title: 'SmartLink Test Casa',
        city: 'Brescia',
        province: 'BS',
        transactionType: 'sale',
        transactionTypes: ['sale'],
        assetClass: 'residential',
        propertyType: 'apartment',
        condition: 'good',
        sellerType: 'agency',
        yearBuilt: 1990,
        sizeSqm: 100,
        price: 250000,
      });
    expect(createListing.status).toBe(201);
    const listingId = createListing.body.id as string;

    await request(api()).post(`/listings/${listingId}/publish`).set(agent).expect(201);

    const forbidden = await request(api())
      .post('/share-links')
      .set(stranger)
      .send({ listingId, includeValuationBand: true });
    expect(forbidden.status).toBe(403);

    const created = await request(api())
      .post('/share-links')
      .set(agent)
      .send({ listingId, includeValuationBand: true });
    expect(created.status).toBe(201);
    const token = created.body.token as string;
    expect(token.length).toBeGreaterThan(20);

    const visitor = 'test-visitor-opaque-id-12345678';
    const first = await request(api())
      .get(`/share-links/public/${token}`)
      .set('X-EC-SL-Viewer', visitor);
    expect(first.status).toBe(200);
    expect(first.body.listing.title).toBe('SmartLink Test Casa');
    expect(first.body.listing.address).toBeUndefined();
    expect(first.body.listing.ownerUserId).toBeUndefined();
    expect(first.body.stats.viewCount).toBe(1);
    expect(first.body.stats.uniqueViewCount).toBe(1);

    const second = await request(api())
      .get(`/share-links/public/${token}`)
      .set('X-EC-SL-Viewer', visitor);
    expect(second.body.stats.viewCount).toBe(2);
    expect(second.body.stats.uniqueViewCount).toBe(1);

    const otherVisitor = 'other-visitor-opaque-id-87654321';
    const third = await request(api())
      .get(`/share-links/public/${token}`)
      .set('X-EC-SL-Viewer', otherVisitor);
    expect(third.body.stats.viewCount).toBe(3);
    expect(third.body.stats.uniqueViewCount).toBe(2);

    const linkId = created.body.id as string;
    await request(api()).post(`/share-links/${linkId}/revoke`).set(agent).expect(201);

    const gone = await request(api()).get(`/share-links/public/${token}`);
    expect(gone.status).toBe(410);

    const missing = await request(api()).get('/share-links/public/does-not-exist-token');
    expect(missing.status).toBe(404);
  });
});
