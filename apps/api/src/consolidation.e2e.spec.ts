import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { resetConfigCache } from './config';
import { ConsolidationModule } from './consolidation.boot';
import { EmailService } from './email/email.service';

/**
 * Proves phases 32–39 coexist in ONE bootable DI graph (Phase 39.1).
 * No Nest `/api` prefix — matches Traefik strip + production paths.
 */
describe('Consolidation 32–39 (full spine)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/db',
      OIDC_ISSUER: 'http://localhost:8080/realms/easycasa',
      OIDC_JWKS_URL: 'http://localhost:8080/realms/easycasa/protocol/openid-connect/certs',
      OIDC_AUDIENCE: 'easycasa-api',
      DEV_AUTH: 'true',
      MEILI_URL: 'http://127.0.0.1:7700',
      MEILI_MASTER_KEY: 'test',
      SMTP_URL: '',
      EMAIL_PROVIDER_URL: '',
      SENTRY_DSN: '',
      REDIS_URL: '',
    });
    resetConfigCache();
    const moduleRef = await Test.createTestingModule({
      imports: [ConsolidationModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('boots the whole infra spine (DI graph resolves)', () => {
    expect(app).toBeDefined();
  });

  it('health surfaces (seam + liveness + readiness)', async () => {
    const seam = await request(app.getHttpServer()).get('/health');
    expect(seam.status).toBe(200);
    expect(seam.body.status).toBe('ok');

    await request(app.getHttpServer()).get('/health/live').expect(200);

    const ready = await request(app.getHttpServer()).get('/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.status).toBe('ready');
  });

  it('/metrics exposes Prometheus and counts requests', async () => {
    const res = await request(app.getHttpServer()).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('app="easycasa-api"');
  });

  it('auth 401 is enveloped by the global filter (35 × 39)', async () => {
    const res = await request(app.getHttpServer()).get('/me');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('statusCode', 401);
    expect(res.body).toHaveProperty('requestId');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('auth 200 with dev principal', async () => {
    await request(app.getHttpServer()).get('/me').set('x-dev-user', 'seeker-1').expect(200);
  });

  it('roles route enforces RolesGuard', async () => {
    await request(app.getHttpServer())
      .get('/admin')
      .set('x-dev-user', 'u1')
      .set('x-dev-roles', 'buyer')
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin')
      .set('x-dev-user', 'a1')
      .set('x-dev-roles', 'admin')
      .expect(200);
  });

  it('5xx is enveloped, hides internals, carries request id', async () => {
    const res = await request(app.getHttpServer()).get('/boom').set('x-dev-user', 'u1');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('kaboom-secret');
    expect(res.body).toHaveProperty('requestId');
  });

  it('privacy export requires the auth-set subject (38 × 35)', async () => {
    await request(app.getHttpServer()).get('/me/privacy/export').expect(401);
    const ok = await request(app.getHttpServer())
      .get('/me/privacy/export')
      .set('x-dev-user', 'anna');
    expect(ok.status).toBe(200);
    expect(ok.body.subjectId).toBe('anna');
  });

  it('email resolves and fail-softs when unconfigured', async () => {
    const email = app.get(EmailService);
    const res = await email.enquiryReceivedSeeker('anna@e.it', {
      seekerName: 'Anna',
      listingTitle: 'X',
      listingUrl: 'https://e.it/x',
    });
    expect(res.provider).toBe('noop');
    expect(res.skipped).toBe(true);
  });
});
