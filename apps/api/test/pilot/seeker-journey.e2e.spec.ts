import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ReferenceAppModule, outbox, resetStore } from './reference-app';

/**
 * Seeker pilot journey (contract) — Phase 37.
 * search → listing → enquiry (2 emails) → viewing (1 email).
 */
describe('Seeker journey (contract)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = (
      await Test.createTestingModule({ imports: [ReferenceAppModule] }).compile()
    ).createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => resetStore());

  const server = () => app.getHttpServer();

  it('1. search finds seeded Milan listings', async () => {
    const res = await request(server())
      .post('/api/search/bounds')
      .send({ minLat: 45.4, minLng: 9.1, maxLat: 45.5, maxLng: 9.3 });
    expect(res.status).toBe(201);
    expect(res.body.count).toBeGreaterThanOrEqual(3);
    expect(res.body.results.some((r: { slug: string }) => r.slug === 'bilocale-navigli-milano')).toBe(
      true,
    );
  });

  it('2. listing detail resolves by slug', async () => {
    const res = await request(server()).get('/api/listings/bilocale-navigli-milano');
    expect(res.status).toBe(200);
    expect(res.body.title).toContain('Navigli');
  });

  it('3. enquiry fires seeker confirmation + owner notification', async () => {
    const res = await request(server())
      .post('/api/listings/bilocale-navigli-milano/enquiries')
      .send({
        seekerName: 'Anna Rossi',
        seekerEmail: 'anna@example.it',
        message: 'È ancora disponibile?',
      });
    expect(res.status).toBe(201);

    const mails = outbox.list();
    expect(mails).toHaveLength(2);
    const toSeeker = mails.find((m) => m.message.to === 'anna@example.it');
    const toOwner = mails.find((m) => m.message.to === 'agente@easycasaita.com');
    expect(toSeeker?.message.subject).toContain('ricevuto');
    expect(toSeeker?.message.subject).toContain('Navigli');
    expect(toOwner?.message.subject).toContain('Nuova richiesta');
    expect(toOwner?.message.text).toContain('anna@example.it');
    expect(toOwner?.message.text).toContain('È ancora disponibile?');
  });

  it('4. booking a viewing fires the confirmation email', async () => {
    const res = await request(server())
      .post('/api/listings/bilocale-navigli-milano/viewings')
      .send({
        seekerName: 'Anna Rossi',
        seekerEmail: 'anna@example.it',
        slot: '2026-07-25T15:00',
        whenLocal: 'ven 25 lug 2026, 15:00',
      });
    expect(res.status).toBe(201);

    const mails = outbox.list('anna@example.it');
    expect(mails).toHaveLength(1);
    expect(mails[0]?.message.subject).toContain('Visita confermata');
    expect(mails[0]?.message.text).toContain('Via Ascanio Sforza 40');
    expect(mails[0]?.message.text).toContain('15:00');
  });

  it('5. unknown listing 404s (no email sent)', async () => {
    await request(server())
      .post('/api/listings/does-not-exist/enquiries')
      .send({ seekerName: 'X', seekerEmail: 'x@y.it', message: 'hi' })
      .expect(404);
    expect(outbox.list()).toHaveLength(0);
  });
});
