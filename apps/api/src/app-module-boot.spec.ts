import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { resetConfigCache } from './config';
import { PersonalDataRegistry } from './privacy/personal-data.registry';

const TEST_ENV = {
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
};

/**
 * Proves AppModule (production composition root) resolves PersonalDataRegistrar DI
 * and populates PersonalDataRegistry at boot. Mirrors integration harness without Docker.
 */
describe('AppModule boot (PersonalDataRegistrar DI)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    Object.assign(process.env, TEST_ENV);
    resetConfigCache();
    const { AppModule } = await import('./app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('boots and registers all personal-data sources', () => {
    expect(app).toBeDefined();
    expect(app.get(PersonalDataRegistry).all().map((s) => s.source).sort()).toEqual([
      'consent',
      'enquiries',
      'profile',
      'saved_searches',
      'viewings',
    ]);
  });
});
