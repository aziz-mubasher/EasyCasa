import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { apiConfig } from '../config';
import { IS_PUBLIC } from './public.decorator';
import type { AuthUser } from './auth.types';
import type { UserRole } from '@easycasa/shared';

/**
 * Verifies a bearer JWT against the OIDC provider's JWKS.
 * In DEV_AUTH mode, trusts x-dev-user / x-dev-roles headers for local testing.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwks = apiConfig.OIDC_JWKS_URL
    ? createRemoteJWKSet(new URL(apiConfig.OIDC_JWKS_URL))
    : null;

  constructor(private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();

    if (apiConfig.DEV_AUTH) {
      const sub = req.headers['x-dev-user'] as string | undefined;
      if (!sub) throw new UnauthorizedException('DEV_AUTH: missing x-dev-user');
      const roles = ((req.headers['x-dev-roles'] as string) ?? 'buyer')
        .split(',')
        .map((r) => r.trim()) as UserRole[];
      req.user = { sub, email: req.headers['x-dev-email'] as string, roles } satisfies AuthUser;
      return true;
    }

    const header = req.headers['authorization'] as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token || !this.jwks) throw new UnauthorizedException('missing token');

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: apiConfig.OIDC_ISSUER,
        audience: apiConfig.OIDC_AUDIENCE,
      });
      req.user = this.toAuthUser(payload);
      return true;
    } catch {
      throw new UnauthorizedException('invalid token');
    }
  }

  private toAuthUser(p: JWTPayload): AuthUser {
    const claim = apiConfig.OIDC_ROLES_CLAIM;
    const raw = claim.split('.').reduce<unknown>((acc, k) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k];
      return undefined;
    }, p);
    const roles = Array.isArray(raw) ? (raw as UserRole[]) : (['buyer'] as UserRole[]);
    return { sub: String(p.sub), email: p.email as string | undefined, roles };
  }
}
