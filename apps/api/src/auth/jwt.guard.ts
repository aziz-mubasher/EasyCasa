import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@easycasa/shared';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import type { AuthUser } from './auth.types';
import { JwtVerifier } from './jwt-verifier';
import { IS_PUBLIC } from './public.decorator';

interface Req {
  headers: Record<string, unknown>;
  user?: AuthUser;
}

/**
 * Global authentication guard — Phase 35 (OIDC cutover).
 *
 * `@Public` routes pass through (soft-attach identity when present for
 * `@OptionalUser`). Otherwise a Bearer token is verified via {@link JwtVerifier}.
 *
 * `DEV_AUTH=true` trusts `x-dev-user` / `x-dev-roles` / `x-dev-email` — the
 * pre-cutover path only. With `DEV_AUTH=false` those headers are never read;
 * callers must send `Authorization: Bearer`. Cutover = `DEV_AUTH=false` + live `OIDC_*`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: JwtVerifier,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const req = ctx.switchToHttp().getRequest<Req>();

    if (isPublic) {
      await this.tryAttachUser(req);
      return true;
    }

    if (this.config.DEV_AUTH) {
      const sub = header(req.headers, 'x-dev-user');
      if (!sub) throw new UnauthorizedException('DEV_AUTH: missing x-dev-user');
      req.user = {
        sub,
        email: header(req.headers, 'x-dev-email'),
        roles: parseRoles(header(req.headers, 'x-dev-roles') ?? 'buyer'),
      };
      return true;
    }

    const token = bearer(req.headers);
    if (!token) throw new UnauthorizedException('missing bearer token');
    if (!this.config.OIDC_JWKS_URL) {
      throw new UnauthorizedException('OIDC_JWKS_URL is not configured');
    }

    req.user = await this.verifier.verify(token);
    return true;
  }

  /** Best-effort auth for @Public routes — never throws. */
  private async tryAttachUser(req: Req): Promise<void> {
    try {
      if (this.config.DEV_AUTH) {
        const sub = header(req.headers, 'x-dev-user');
        if (!sub) return;
        req.user = {
          sub,
          email: header(req.headers, 'x-dev-email'),
          roles: parseRoles(header(req.headers, 'x-dev-roles') ?? 'buyer'),
        };
        return;
      }
      const token = bearer(req.headers);
      if (!token || !this.config.OIDC_JWKS_URL) return;
      req.user = await this.verifier.verify(token);
    } catch {
      // public route stays anonymous
    }
  }
}

function header(headers: Record<string, unknown>, key: string): string | undefined {
  const v = headers[key];
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return undefined;
}

function bearer(headers: Record<string, unknown>): string | null {
  const auth = header(headers, 'authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function parseRoles(raw: string): UserRole[] {
  return raw
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean) as UserRole[];
}
