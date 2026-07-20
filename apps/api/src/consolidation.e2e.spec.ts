import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { resetConfigCache } from './config';
import { ConsolidationModule } from './consolidation.boot';
import { EmailService } from './email/email.service';

/**
 * Proves phases 32–36 coexist in one bootable DI graph (Phase 36.1).
 * No Nest `/api` prefix — matches Traefik strip + production paths.
 */
describe('Consolidation 32–36 (single DI graph)', () => {
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
    });
    resetConfigCache();
    const moduleRef = await Test.createTestingModule({ imports: [ConsolidationModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('boots the whole infra spine (DI graph resolves)', () => {
    expect(app).toBeDefined();
  });

  it('/health is public and reports seam status (config→seams)', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    const byName = Object.fromEntries(
      (res.body.seams as Array<{ name: string; configured: boolean }>).map((s) => [
        s.name,
        s.configured,
      ]),
    );
    expect(byName.meili).toBe(true);
    expect(byName.psp).toBe(false);
  });

  it('authed route enforces the global JWT guard (auth)', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
    await request(app.getHttpServer()).get('/me').set('x-dev-user', 'seeker-1').expect(200);
  });

  it('roles route enforces RolesGuard (auth)', async () => {
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

  it('email resolves and fail-softs when unconfigured (config→email)', async () => {
    const email = app.get(EmailService);
    const res = await email.enquiryReceivedSeeker('anna@e.it', {
      seekerName: 'Anna',
      listingTitle: 'X',
      listingUrl: 'u',
    });
    expect(res).toMatchObject({ provider: 'noop', delivered: false, skipped: true });
  });
});
