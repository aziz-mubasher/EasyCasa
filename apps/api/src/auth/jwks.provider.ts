import { createRemoteJWKSet } from 'jose';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';

/**
 * Injection token for the JWKS key resolver used to verify OIDC tokens.
 *
 * Production: remote cached set from `OIDC_JWKS_URL` (lazy — no network at boot).
 * Tests: override with `createLocalJWKSet` so crypto runs offline.
 */
export const JWKS_RESOLVER = Symbol('JWKS_RESOLVER');

export type JwksResolver = ReturnType<typeof createRemoteJWKSet>;

export const jwksProvider = {
  provide: JWKS_RESOLVER,
  useFactory: (config: ApiConfig): JwksResolver => {
    // Empty string in .env must not become `new URL("")` — crash at boot under DEV_AUTH.
    const raw = config.OIDC_JWKS_URL?.trim();
    const url = raw && raw.length > 0 ? raw : 'http://127.0.0.1/.well-known/jwks-not-configured';
    return createRemoteJWKSet(new URL(url));
  },
  inject: [APP_CONFIG],
};
