import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { dockerAvailable, startIntegration } from './harness';
import { asUser } from './test-auth';

/**
 * EC-22 upload flow on the shared harness (MinIO + ASTE_ANALYSIS_ENABLED
 * are set before AppModule boots). Flag-off → 404 is unit-tested.
 */
const gate = dockerAvailable() ? describe : describe.skip;

gate('Aste analysis upload flow (integration)', () => {
  let app: INestApplication;
  let stop: (() => Promise<void>) | undefined;

  const owner = asUser({
    sub: 'aste-owner',
    email: 'aste-owner@example.it',
    name: 'Aste Owner',
    roles: ['buyer'],
  });
  const other = asUser({
    sub: 'aste-other',
    email: 'aste-other@example.it',
    name: 'Aste Other',
    roles: ['buyer'],
  });

  beforeAll(async () => {
    const ctx = await startIntegration();
    app = ctx.app;
    stop = async () => {
      await ctx.stop();
    };
  }, 300_000);

  afterAll(async () => {
    await stop?.();
  });

  const api = () => app.getHttpServer();

  it('create → upload pdf+jpg → submit; rejects bad mime; owner-only; delete', async () => {
    const created = await request(api()).post('/aste/analyses').set(owner).send({
      language: 'it',
      register: 'first_buyer',
    });
    expect([200, 201]).toContain(created.status);
    const id = created.body.id as string;
    expect(created.body.status).toBe('draft');

    const pdf = await request(api())
      .post(`/aste/analyses/${id}/documents`)
      .set(owner)
      .field('docType', 'perizia')
      .attach('file', Buffer.from('%PDF-1.4 test'), {
        filename: 'perizia.pdf',
        contentType: 'application/pdf',
      });
    expect([200, 201]).toContain(pdf.status);
    expect(pdf.body.docType).toBe('perizia');

    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
    ]);
    const img = await request(api())
      .post(`/aste/analyses/${id}/documents`)
      .set(owner)
      .field('docType', 'planimetria')
      .attach('file', jpeg, { filename: 'plan.jpg', contentType: 'image/jpeg' });
    expect([200, 201]).toContain(img.status);

    const badMime = await request(api())
      .post(`/aste/analyses/${id}/documents`)
      .set(owner)
      .field('docType', 'altro')
      .attach('file', Buffer.from('hello'), {
        filename: 'x.txt',
        contentType: 'text/plain',
      });
    expect(badMime.status).toBeGreaterThanOrEqual(400);

    const submitted = await request(api()).post(`/aste/analyses/${id}/submit`).set(owner);
    expect([200, 201]).toContain(submitted.status);
    expect(submitted.body.status).toBe('uploaded');

    const detail = await request(api()).get(`/aste/analyses/${id}`).set(owner);
    expect(detail.status).toBe(200);
    expect(detail.body.documents).toHaveLength(2);

    const foreign = await request(api()).get(`/aste/analyses/${id}`).set(other);
    expect([403, 404]).toContain(foreign.status);

    const del = await request(api()).delete(`/aste/analyses/${id}`).set(owner);
    expect([200, 201]).toContain(del.status);
    const gone = await request(api()).get(`/aste/analyses/${id}`).set(owner);
    expect(gone.status).toBe(404);
  });
});
