/**
 * Pilot preflight — Phase 40. Automated go/no-go over the environment BEFORE a
 * real seeker touches the pilot. Pure over its inputs (env + a reachability
 * probe) so it's testable and can run in CI against staging. Distinguishes hard
 * blockers (no-go) from warnings (proceed with caution).
 */
export interface PreflightCheck {
  name: string;
  pass: boolean;
  level: 'blocker' | 'warn';
  detail?: string;
}
export interface PreflightReport {
  go: boolean;
  checks: PreflightCheck[];
}

export interface PreflightInput {
  env: Record<string, string | undefined>;
  /** e.g. probe('/health/ready') → { ok, status } (path is relative to API base). */
  probe: (path: string) => Promise<{ ok: boolean; status: number }>;
  /** Count of seeded listings (from the DB), to catch an empty map. */
  listingCount: () => Promise<number>;
}

export async function runPreflight(input: PreflightInput): Promise<PreflightReport> {
  const { env } = input;
  const checks: PreflightCheck[] = [];
  const add = (
    name: string,
    pass: boolean,
    level: PreflightCheck['level'],
    detail?: string,
  ) => checks.push({ name, pass, level, detail });

  // Auth must be real in a pilot — DEV_AUTH is a local-only bypass.
  add(
    'DEV_AUTH is off',
    env.DEV_AUTH !== 'true',
    'blocker',
    'DEV_AUTH=true would trust spoofable headers',
  );
  const jwks = env.OIDC_JWKS_URL || env.OIDC_JWKS_URI;
  add(
    'OIDC configured',
    Boolean(env.OIDC_ISSUER && jwks && env.OIDC_AUDIENCE),
    'blocker',
    'set OIDC_ISSUER, OIDC_JWKS_URL, OIDC_AUDIENCE',
  );
  // Email must be able to send for the seeker journey.
  add(
    'email transport set',
    Boolean(env.SMTP_URL || env.EMAIL_PROVIDER_URL),
    'blocker',
    'set SMTP_URL or EMAIL_PROVIDER_URL',
  );
  // Observability
  add(
    'Sentry configured',
    Boolean(env.SENTRY_DSN),
    'warn',
    '5xx will not be reported without SENTRY_DSN',
  );

  // Reachability
  try {
    const ready = await input.probe('/health/ready');
    add(
      'readiness green',
      ready.ok,
      'blocker',
      ready.ok ? undefined : `/health/ready → ${ready.status}`,
    );
  } catch (err) {
    add('readiness green', false, 'blocker', String(err));
  }

  // Seed
  try {
    const n = await input.listingCount();
    add(
      'listings seeded',
      n > 0,
      'blocker',
      n > 0 ? `${n} listings` : 'no listings — run the pilot seed',
    );
  } catch (err) {
    add('listings seeded', false, 'blocker', String(err));
  }

  const go = checks.filter((c) => c.level === 'blocker').every((c) => c.pass);
  return { go, checks };
}
