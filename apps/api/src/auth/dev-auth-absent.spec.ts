import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * EC-14 Part 0 — production must not carry a client or server auth bypass
 * identified by the historical bypass flag name.
 *
 * `EC_TEST_AUTH` under `NODE_ENV=test` is allowed (vitest only).
 */

const REPO_ROOT = join(__dirname, '../../../..');

/** Concatenated so this file itself does not contain the banned token. */
const BANNED = 'DEV' + '_AUTH';

const FILES = [
  'apps/admin/Dockerfile',
  'apps/admin/src/auth/config.ts',
  'apps/admin/src/auth/AuthProvider.tsx',
  'apps/admin/src/api.tsx',
  'apps/admin/src/App.tsx',
  'apps/admin/src/vite-env.d.ts',
  'apps/api/src/auth/jwt.guard.ts',
  'apps/api/src/config/load.ts',
  'apps/api/src/auth/auth.module.ts',
  'infra/docker-compose.yml',
  'infra/docker-compose.traefik.yml',
  'infra/docker-compose.keycloak.yml',
  'infra/keycloak/realm-easycasa.json',
  '.env.example',
  '.env.oidc.example',
  '.env.test',
] as const;

describe('EC-14 Part 0 — auth bypass identifier absent', () => {
  it(`does not contain ${BANNED} in admin, auth config, compose, or env examples`, () => {
    const offenders: string[] = [];
    for (const rel of FILES) {
      const src = readFileSync(join(REPO_ROOT, rel), 'utf8');
      if (src.includes(BANNED)) offenders.push(rel);
    }
    expect(offenders, `banned token found in:\n${offenders.join('\n')}`).toEqual([]);
  });
});
