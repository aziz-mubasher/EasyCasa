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
 * Seeker journey — REAL acceptance test (Phase 37). Docker-gated.
 * Paths match production (no `/api` prefix). Viewing confirmation email fires
 * on CONFIRM (not REQUESTED), matching ViewingsService.
 */
const gate = dockerAvailable() ? describe : describe.skip;

gate('Seeker journey (real modules, real DB)', () => {
  let ctx: IntegrationContext;
  let outbox: OutboxEmailProvider;

  beforeAll(async () => {
    ctx = await startIntegration();
    outbox = ctx.app.get(EMAIL_OUTBOX);
    const seed = ctx.app.get(PilotSeedService);
    await seed.run();
  }, 300_000);

  afterAll(async () => {
    await ctx?.stop();
  });

  const api = () => ctx.app.getHttpServer();

  it('search → listing → enquiry → viewing completes with email side-effects', async () => {
    outbox.clear();

    const search = await request(api())
      .post('/search/bounds')
      .send({
        minLat: 45.4,
        minLng: 9.1,
        maxLat: 45.5,
        maxLng: 9.3,
        zoom: 12,
      });
    expect(search.status).toBe(201);
    expect(search.body.total).toBeGreaterThanOrEqual(1);
    const pin = search.body.pins?.[0];
    expect(pin?.listingId).toBeTruthy();
    const listingId = pin.listingId as string;

    const detail = await request(api()).get(`/listings/${listingId}`);
    expect(detail.status).toBe(200);

    const owner = asUser({
      sub: 'pilot-owner',
      email: 'agente@easycasaita.com',
      name: 'Agenzia EasyCasa',
      roles: ['agent'],
    });
    const seeker = asUser({
      sub: 'seeker-1',
      email: 'anna@example.it',
      name: 'Anna Rossi',
      roles: ['buyer'],
    });

    // Ensure owner principal maps to the seeded owner user (same email).
    await request(api()).get('/me/enquiries').set(owner);

    for (const purpose of ['privacy_policy', 'mediation_disclosure'] as const) {
      await request(api())
        .post('/me/privacy/consents')
        .set(seeker)
        .send({ purpose, granted: true, policyVersion: 'v1-draft' })
        .expect(201);
    }

    const enquiry = await request(api())
      .post(`/listings/${listingId}/enquiries`)
      .set(seeker)
      .send({
        intent: 'viewing',
        message: 'È ancora disponibile?',
        contactEmail: 'anna@example.it',
      });
    expect([200, 201]).toContain(enquiry.status);

    const enquiryMails = outbox.list();
    expect(enquiryMails.length).toBeGreaterThanOrEqual(2);
    expect(enquiryMails.some((m) => m.message.to === 'anna@example.it')).toBe(true);
    expect(enquiryMails.some((m) => m.message.to === 'agente@easycasaita.com')).toBe(true);

    outbox.clear();

    // Open availability: every weekday 9–12 for the next booking window.
    const windows = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      weekday,
      startMinutes: 9 * 60,
      endMinutes: 12 * 60,
    }));
    await request(api())
      .post(`/listings/${listingId}/availability`)
      .set(owner)
      .send({ windows })
      .expect(201);

    const fromMs = Date.now() + 3 * 24 * 60 * 60_000;
    const toMs = fromMs + 14 * 24 * 60 * 60_000;
    const slots = await request(api()).get(
      `/listings/${listingId}/slots?from=${fromMs}&to=${toMs}`,
    );
    expect(slots.status).toBe(200);
    expect(slots.body.length).toBeGreaterThan(0);
    const startMs = slots.body[0].startMs as number;

    const viewing = await request(api())
      .post(`/listings/${listingId}/viewings`)
      .set(seeker)
      .send({ startMs });
    expect([200, 201]).toContain(viewing.status);
    const viewingId = viewing.body.id as string;

    await request(api()).post(`/viewings/${viewingId}/confirm`).set(owner).expect(201);

    const confirmMails = outbox.list('anna@example.it');
    expect(confirmMails.length).toBeGreaterThanOrEqual(1);
    expect(confirmMails[0]?.message.subject).toContain('Visita confermata');
  });
});
