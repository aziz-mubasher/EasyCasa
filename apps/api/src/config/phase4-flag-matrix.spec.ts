/**
 * EC-S-T32 — Phase 4 counsel-gated feature flags must default OFF.
 * Consolidation guard: prevents accidental enablement in load schema / examples.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadApiConfig } from '../config';

const REPO_ROOT = resolve(__dirname, '../../../../');

const PHASE4_FLAGS = [
  'SELLER_PREMIUM_ENABLED',
  'LISTING_BOOST_ENABLED',
  'PARTNER_DIRECTORY_ENABLED',
] as const;

const baseEnv = {
  DATABASE_URL: 'postgresql://easycasa:x@localhost:5432/easycasa',
  WA_HANDLE_SECRET: 'test-wa-handle-secret-xx',
  ALLOW_PROVIDER_STUBS: 'true',
  EC_TEST_AUTH: 'true',
};

describe('EC-S-T32 Phase 4 flag matrix (defaults off)', () => {
  it('loadApiConfig defaults Phase 4 monetisation / directory flags to false', () => {
    const cfg = loadApiConfig(baseEnv);
    for (const key of PHASE4_FLAGS) {
      expect(cfg[key], key).toBe(false);
    }
  });

  it('.env.example documents Phase 4 flags as false', () => {
    const text = readFileSync(resolve(REPO_ROOT, '.env.example'), 'utf8');
    for (const key of PHASE4_FLAGS) {
      expect(text, key).toMatch(new RegExp(`^${key}=false\\s*$`, 'm'));
    }
  });

  it('docs/env.md mentions each Phase 4 flag', () => {
    const text = readFileSync(resolve(REPO_ROOT, 'docs/env.md'), 'utf8');
    for (const key of PHASE4_FLAGS) {
      expect(text).toContain(key);
    }
  });
});
