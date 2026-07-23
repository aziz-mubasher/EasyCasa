import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PilotSeedService } from '../../src/pilot/pilot.module';
import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';
import { asUser } from './test-auth';

/**
 * Enquiry consent gate — authenticated seeker must record privacy + mediation
 * consents before POST /listings/:id/enquiries succeeds (GDPR Art. 7).
 */
const gate = dockerAvailable() ? describe : describe.skip;

gate('POST /listings/:id/enquiries consent gate (integration)', () => {
  let ctx: IntegrationContext;
  let listingId: string;

  beforeAll(async () => {
    ctx = await startIntegration();
    const seed = ctx.app.get(PilotSeedService);
    await seed.run();

    const search = await request(ctx.app.getHttpServer())
      .post('/search/bounds')
      .send({
        minLat: 45.4,
        minLng: 9.1,
        maxLat: 45.5,
        maxLng: 9.3,
        zoom: 12,
      });
    listingId = search.body.pins?.[0]?.listingId as string;
    expect(listingId).toBeTruthy();
  }, 300_000);

  afterAll(async () => {
    await ctx?.stop();
  });

  const api = () => ctx.app.getHttpServer();

  const seeker = asUser({
    sub: 'consent-gate-seeker',
    email: 'consent-gate@example.it',
    name: 'Consent Gate Seeker',
    roles: ['buyer'],
  });

  const enquiryBody = {
    intent: 'info' as const,
    message: 'Vorrei maggiori informazioni.',
    contactEmail: 'consent-gate@example.it',
  };

  it('403s when required consents are missing', async () => {
    const res = await request(api())
      .post(`/listings/${listingId}/enquiries`)
      .set(seeker)
      .send(enquiryBody);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/missing required consent/);
    expect(res.body.error).toMatch(/privacy_policy/);
    expect(res.body.error).toMatch(/mediation_disclosure/);
  });

  it('201s after both consents are recorded for the same principal', async () => {
    for (const purpose of ['privacy_policy', 'mediation_disclosure'] as const) {
      await request(api())
        .post('/me/privacy/consents')
        .set(seeker)
        .send({ purpose, granted: true, policyVersion: 'v1-draft' })
        .expect(201);
    }

    const res = await request(api())
      .post(`/listings/${listingId}/enquiries`)
      .set(seeker)
      .send(enquiryBody);
    expect([200, 201]).toContain(res.status);
    expect(res.body.id).toBeTruthy();
  });
});
