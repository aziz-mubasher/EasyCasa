import { describe, it, expect } from 'vitest';

import { AmlAdapter } from '../config/adapters/aml.adapter';
import { MeiliAdapter } from '../config/adapters/meili.adapter';
import { NotificationsAdapter } from '../config/adapters/notifications.adapter';
import { PspAdapter } from '../config/adapters/psp.adapter';
import { RliAdapter } from '../config/adapters/rli.adapter';
import { SdiAdapter } from '../config/adapters/sdi.adapter';
import { SignatureAdapter } from '../config/adapters/signature.adapter';
import type { SeamStatus } from '../config/adapters/seam';
import type { ApiConfig } from '../config';
import { HealthController } from './health.controller';

function stubConfig(over: Partial<ApiConfig> = {}): ApiConfig {
  return {
    API_PORT: 4000,
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://easycasa:x@localhost:5432/easycasa',
    DEV_AUTH: true,
    OIDC_ISSUER: undefined,
    OIDC_AUDIENCE: undefined,
    OIDC_JWKS_URL: undefined,
    OIDC_ROLES_CLAIM: 'roles',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    BILLING_SUCCESS_URL: '',
    BILLING_CANCEL_URL: '',
    CURRENCY: 'eur',
    SMTP_URL: '',
    NOTIFY_FROM: '',
    CORS_ORIGINS: '',
    MEILI_URL: 'http://127.0.0.1:7700',
    MEILI_MASTER_KEY: 'test',
    S3_ENDPOINT: '',
    S3_REGION: 'us-east-1',
    MINIO_ROOT_USER: '',
    MINIO_ROOT_PASSWORD: '',
    MINIO_BUCKET: '',
    MEDIA_PUBLIC_BASE: '',
    SIGNATURE_PROVIDER_URL: '',
    SIGNATURE_PROVIDER_KEY: '',
    SIGNATURE_WEBHOOK_SECRET: '',
    RLI_CHANNEL_URL: '',
    RLI_CHANNEL_CREDENTIAL: '',
    AML_SCREENING_URL: '',
    AML_SCREENING_KEY: '',
    PSP_API_URL: '',
    PSP_SECRET_KEY: '',
    SDI_CHANNEL_URL: '',
    SDI_CHANNEL_KEY: '',
    EASYCASA_PIVA: '',
    EASYCASA_DENOMINAZIONE: '',
    PUSH_PROVIDER_URL: '',
    EMAIL_PROVIDER_URL: '',
    REDIS_URL: '',
    RETENTION_LEAD_DAYS: 90,
    SENTRY_DSN: '',
    ...over,
  };
}

describe('HealthController', () => {
  it('reports ok with seam snapshot', () => {
    const cfg = stubConfig({ PSP_API_URL: 'https://psp.example', PSP_SECRET_KEY: 'k' });
    const res = new HealthController(
      new PspAdapter(cfg),
      new SdiAdapter(cfg),
      new AmlAdapter(cfg),
      new RliAdapter(cfg),
      new SignatureAdapter(cfg),
      new NotificationsAdapter(cfg),
      new MeiliAdapter(cfg),
    ).check();
    expect(res.status).toBe('ok');
    expect(res.seams.find((s: SeamStatus) => s.name === 'psp')?.configured).toBe(true);
    expect(res.seams.find((s: SeamStatus) => s.name === 'sdi')?.configured).toBe(false);
    expect(res.seams.find((s: SeamStatus) => s.name === 'meili')?.configured).toBe(true);
  });
});
