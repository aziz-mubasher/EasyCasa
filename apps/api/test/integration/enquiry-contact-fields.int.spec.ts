import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  EMAIL_OUTBOX,
  OutboxEmailProvider,
} from '../../src/email/providers/outbox-email.provider';
import { PilotSeedService } from '../../src/pilot/pilot.module';
import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';
import { asUser } from './test-auth';

/**
 * Enquiry phone + WhatsApp — persists on create and surfaces in owner notification email.
 */
const gate = dockerAvailable() ? describe : describe.skip;

gate('POST /listings/:id/enquiries phone + WhatsApp (integration)', () => {
  let ctx: IntegrationContext;
  let listingId: string;
  let outbox: OutboxEmailProvider;

  beforeAll(async () => {
    ctx = await startIntegration();
    outbox = ctx.app.get(EMAIL_OUTBOX);
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
    sub: 'enquiry-phone-seeker',
    email: 'phone-seeker@example.it',
    name: 'Phone Seeker',
    roles: ['buyer'],
  });

  const enquiryBody = {
    intent: 'info' as const,
    message: 'Vorrei maggiori informazioni con telefono.',
    contactEmail: 'phone-seeker@example.it',
    contactPhone: '+39 333 111 2222',
    contactWhatsappAvailable: true,
  };

  it('403s when required consents are missing (unchanged gate)', async () => {
    outbox.clear();
    const res = await request(api())
      .post(`/listings/${listingId}/enquiries`)
      .set(seeker)
      .send(enquiryBody);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/missing required consent/);
  });

  it('persists phone + WhatsApp and owner email mentions them after consents', async () => {
    outbox.clear();
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
    expect(res.body.contactPhone).toBe(enquiryBody.contactPhone);
    expect(res.body.contactWhatsappAvailable).toBe(true);

    const ownerMail = outbox
      .list()
      .find((m) => m.message.to === 'agente@easycasaita.com');
    expect(ownerMail).toBeTruthy();
    expect(ownerMail?.message.text).toContain(enquiryBody.contactPhone);
    expect(ownerMail?.message.text).toMatch(/WhatsApp/i);
  });
});
