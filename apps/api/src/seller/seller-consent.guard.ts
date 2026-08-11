import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { SellerService } from './seller.service';

/**
 * EC-S-T30 — block seller feature entry when informativa re-acceptance is
 * required or the acceptance pointer is invalid. Onboarding / informativa
 * routes stay on SellerController without this guard.
 */
@Injectable()
export class SellerConsentGuard implements CanActivate {
  constructor(
    private readonly users: UsersService,
    private readonly seller: SellerService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const auth = req.user;
    if (!auth) throw new UnauthorizedException();
    const me = await this.users.getOrCreate(auth);
    await this.seller.assertFeatureEntryAllowed(me.id);
    return true;
  }
}
