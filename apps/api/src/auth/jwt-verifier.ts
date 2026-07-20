import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify, type JWTPayload } from 'jose';
import type { UserRole } from '@easycasa/shared';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import type { AuthUser } from './auth.types';
import { JWKS_RESOLVER, type JwksResolver } from './jwks.provider';

/**
 * OIDC token verification core — Phase 35.
 *
 * Verifies signature (JWKS), issuer, audience, and expiry via `jose`, then maps
 * claims to {@link AuthUser}. Roles come from `OIDC_ROLES_CLAIM` (default
 * `realm_access.roles` — Keycloak). Unit-testable with a local JWKS override.
 */
@Injectable()
export class JwtVerifier {
  constructor(
    @InjectConfig() private readonly config: ApiConfig,
    @Inject(JWKS_RESOLVER) private readonly jwks: JwksResolver,
  ) {}

  async verify(token: string): Promise<AuthUser> {
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, this.jwks, {
        issuer: this.config.OIDC_ISSUER,
        audience: this.config.OIDC_AUDIENCE,
      }));
    } catch {
      throw new UnauthorizedException('invalid token');
    }

    if (!payload.sub) throw new UnauthorizedException('token missing subject');

    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      roles: extractRoles(payload, this.config.OIDC_ROLES_CLAIM),
    };
  }
}

/** Read roles from a dotted claim path; tolerant of shape. */
export function extractRoles(payload: JWTPayload, claimPath: string): UserRole[] {
  let node: unknown = payload;
  for (const segment of claimPath.split('.')) {
    if (node && typeof node === 'object' && segment in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[segment];
    } else {
      return [];
    }
  }
  if (!Array.isArray(node)) return [];
  return node.filter((r): r is string => typeof r === 'string') as UserRole[];
}
