import { describe, expect, it } from 'vitest';

import { loadApiConfig } from './config';

const base = {
  DATABASE_URL: 'postgresql://easycasa:x@localhost:5432/easycasa',
};

describe('loadApiConfig', () => {
  it('allows missing OIDC when ALLOW_PROVIDER_STUBS=true EC_TEST_AUTH=true', () => {
    const cfg = loadApiConfig({ ...base, ALLOW_PROVIDER_STUBS: 'true', EC_TEST_AUTH: 'true' });
    expect(cfg.ALLOW_PROVIDER_STUBS).toBe(true);
    expect(cfg.OIDC_ISSUER).toBeUndefined();
  });

  it('requires OIDC when stubs/test-auth are off', () => {
    expect(() => loadApiConfig({ ...base, ALLOW_PROVIDER_STUBS: 'false', EC_TEST_AUTH: 'false' })).toThrow(/OIDC_ISSUER/);
  });

  it('accepts full OIDC when stubs/test-auth are off', () => {
    const cfg = loadApiConfig({
      ...base,
      ALLOW_PROVIDER_STUBS: 'false', EC_TEST_AUTH: 'false',
      OIDC_ISSUER: 'https://auth.example/realms/easycasa',
      OIDC_AUDIENCE: 'easycasa-api',
      OIDC_JWKS_URL: 'https://auth.example/realms/easycasa/protocol/openid-connect/certs',
    });
    expect(cfg.ALLOW_PROVIDER_STUBS).toBe(false);
    expect(cfg.OIDC_ISSUER).toContain('easycasa');
  });

  it('treats blank OIDC_* env values as unset', () => {
    const cfg = loadApiConfig({
      ...base,
      ALLOW_PROVIDER_STUBS: 'true', EC_TEST_AUTH: 'true',
      OIDC_ISSUER: '',
      OIDC_AUDIENCE: '',
      OIDC_JWKS_URL: '',
    });
    expect(cfg.OIDC_ISSUER).toBeUndefined();
    expect(cfg.OIDC_JWKS_URL).toBeUndefined();
  });

  it('defaults OIDC_ROLES_CLAIM to realm_access.roles', () => {
    const cfg = loadApiConfig({ ...base, ALLOW_PROVIDER_STUBS: 'true', EC_TEST_AUTH: 'true' });
    expect(cfg.OIDC_ROLES_CLAIM).toBe('realm_access.roles');
  });

  it('defaults Phase 30 notification seams to empty', () => {
    const cfg = loadApiConfig({ ...base, ALLOW_PROVIDER_STUBS: 'true', EC_TEST_AUTH: 'true' });
    expect(cfg.PUSH_PROVIDER_URL).toBe('');
    expect(cfg.EMAIL_PROVIDER_URL).toBe('');
    expect(cfg.REDIS_URL).toBe('');
  });
});
