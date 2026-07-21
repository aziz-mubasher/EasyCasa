import { describe, expect, it } from 'vitest';

import { runPreflight } from '../../src/pilot/smoke/pilot-preflight';

const goodEnv = {
  DEV_AUTH: 'false',
  OIDC_ISSUER: 'https://kc/realms/e',
  OIDC_JWKS_URL: 'https://kc/certs',
  OIDC_AUDIENCE: 'easycasa-api',
  SMTP_URL: 'smtp://relay:587',
  SENTRY_DSN: 'https://x@sentry/1',
};
const ready = async () => ({ ok: true, status: 200 });
const seeded = async () => 4;
const jwksOk = async () => ({ ok: true, status: 200 });

describe('pilot preflight (go/no-go)', () => {
  it('GO when everything is set and green', async () => {
    const r = await runPreflight({ env: goodEnv, probe: ready, fetchUrl: jwksOk, listingCount: seeded });
    expect(r.go).toBe(true);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  it('NO-GO when DEV_AUTH is on (blocker)', async () => {
    const r = await runPreflight({
      env: { ...goodEnv, DEV_AUTH: 'true' },
      probe: ready,
      fetchUrl: jwksOk,
      listingCount: seeded,
    });
    expect(r.go).toBe(false);
    expect(r.checks.find((c) => c.name === 'DEV_AUTH is off')?.pass).toBe(false);
  });

  it('NO-GO when email is unset (blocker)', async () => {
    const noEmail = { ...goodEnv };
    delete noEmail.SMTP_URL;
    const r = await runPreflight({ env: noEmail, probe: ready, fetchUrl: jwksOk, listingCount: seeded });
    expect(r.go).toBe(false);
  });

  it('NO-GO when the map is unseeded', async () => {
    const r = await runPreflight({
      env: goodEnv,
      probe: ready,
      fetchUrl: jwksOk,
      listingCount: async () => 0,
    });
    expect(r.go).toBe(false);
    expect(r.checks.find((c) => c.name === 'listings seeded')?.detail).toContain('no listings');
  });

  it('missing SENTRY_DSN is a WARNING, not a blocker (still GO)', async () => {
    const noSentry = { ...goodEnv };
    delete noSentry.SENTRY_DSN;
    const r = await runPreflight({ env: noSentry, probe: ready, fetchUrl: jwksOk, listingCount: seeded });
    expect(r.go).toBe(true);
    expect(r.checks.find((c) => c.name === 'Sentry configured')).toMatchObject({
      pass: false,
      level: 'warn',
    });
  });

  it('NO-GO when readiness probe is down', async () => {
    const r = await runPreflight({
      env: goodEnv,
      probe: async () => ({ ok: false, status: 503 }),
      fetchUrl: jwksOk,
      listingCount: seeded,
    });
    expect(r.go).toBe(false);
  });

  it('NO-GO when JWKS URL is unreachable (blocker)', async () => {
    const r = await runPreflight({
      env: goodEnv,
      probe: ready,
      fetchUrl: async () => ({ ok: false, status: 503 }),
      listingCount: seeded,
    });
    expect(r.go).toBe(false);
    expect(r.checks.find((c) => c.name === 'JWKS reachable')?.pass).toBe(false);
  });

  it('NO-GO when OIDC vars are missing (JWKS check fails too)', async () => {
    const noOidc = { ...goodEnv };
    delete noOidc.OIDC_JWKS_URL;
    const r = await runPreflight({ env: noOidc, probe: ready, listingCount: seeded });
    expect(r.go).toBe(false);
    expect(r.checks.find((c) => c.name === 'OIDC configured')?.pass).toBe(false);
  });
});
