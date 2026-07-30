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
    EC_TEST_AUTH: true,
    ALLOW_PROVIDER_STUBS: true,
    OIDC_ISSUER: undefined,
    OIDC_AUDIENCE: undefined,
    OIDC_JWKS_URL: undefined,
    OIDC_ROLES_CLAIM: 'roles',
    WHATSAPP_TOKEN: '',
    WHATSAPP_PHONE_NUMBER_ID: '',
    WHATSAPP_OTP_TEMPLATE: '',
    WHATSAPP_OTP_TEMPLATE_LANG: 'it',
    WHATSAPP_GRAPH_VERSION: 'v21.0',
    WHATSAPP_VERIFY_TOKEN: '',
    WHATSAPP_APP_SECRET: '',
    PHONE_OTP_PEPPER: 'test-phone-otp-pepper-xx',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    PAYMENTS_ENABLED: false,
    GO_LIVE_PAYMENTS_ACK: false,
    PAYMENTS_SUCCESS_URL: '',
    PAYMENTS_CANCEL_URL: '',
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
    MEDIA_ORIGIN: 'minio',
    MEDIA_PUBLIC_BASE: '',
    MEDIA_PRIVATE_BASE: '',
    BUNNY_STORAGE_ZONE: '',
    BUNNY_STORAGE_PASSWORD: '',
    BUNNY_STORAGE_ENDPOINT: 'https://storage.bunnycdn.com',
    BUNNY_CDN_BASE: '',
    BUNNY_S3_REGION: 'de',
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
    BANKS4ALL_ATTESTATION_BASE_URL: '',
    BANKS4ALL_PARTNER_TOKEN: '',
    DEMO_MODE: false,
    SENTRY_DSN: '',
    VALUATION_BAND_ENABLED: false,
    SHARE_VIEW_HMAC_SECRET: 'test-smartlink-view-secret',
    AGENCY_PUBLIC_NAME: 'Easy Casa Italy',
    AGENCY_PUBLIC_EMAIL: 'info@easycasaita.com',
    AGENCY_PUBLIC_PHONE: '',
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
