import { describe, expect, it } from 'vitest';

import { loadApiConfig } from './config';

const base = {
  DATABASE_URL: 'postgresql://easycasa:x@localhost:5432/easycasa',
};

describe('loadApiConfig', () => {
  it('allows missing OIDC when DEV_AUTH=true', () => {
    const cfg = loadApiConfig({ ...base, DEV_AUTH: 'true' });
    expect(cfg.DEV_AUTH).toBe(true);
    expect(cfg.OIDC_ISSUER).toBeUndefined();
  });

  it('requires OIDC when DEV_AUTH is false', () => {
    expect(() => loadApiConfig({ ...base, DEV_AUTH: 'false' })).toThrow(/OIDC_ISSUER/);
  });

  it('accepts full OIDC when DEV_AUTH is false', () => {
    const cfg = loadApiConfig({
      ...base,
      DEV_AUTH: 'false',
      OIDC_ISSUER: 'https://auth.example/realms/easycasa',
      OIDC_AUDIENCE: 'easycasa-api',
      OIDC_JWKS_URL: 'https://auth.example/realms/easycasa/protocol/openid-connect/certs',
    });
    expect(cfg.DEV_AUTH).toBe(false);
    expect(cfg.OIDC_ISSUER).toContain('easycasa');
  });

  it('defaults OIDC_ROLES_CLAIM to realm_access.roles', () => {
    const cfg = loadApiConfig({ ...base, DEV_AUTH: 'true' });
    expect(cfg.OIDC_ROLES_CLAIM).toBe('realm_access.roles');
  });

  it('defaults Phase 30 notification seams to empty', () => {
    const cfg = loadApiConfig({ ...base, DEV_AUTH: 'true' });
    expect(cfg.PUSH_PROVIDER_URL).toBe('');
    expect(cfg.EMAIL_PROVIDER_URL).toBe('');
    expect(cfg.REDIS_URL).toBe('');
  });
});
