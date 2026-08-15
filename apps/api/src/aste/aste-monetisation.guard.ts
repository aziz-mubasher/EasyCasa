import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import type { AuthUser } from '../auth/auth.types';
import { asteUserHasAnalysisAccess } from './aste-access';

interface AsteReq {
  user?: AuthUser;
}

/**
 * EC-27 / EC-36 — credits/checkout/unlock inert unless payments on and analysis accessible
 * (public flag or internal preview + allowlisted user).
 */
@Injectable()
export class AsteMonetisationEnabledGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.config.PAYMENTS_ENABLED) {
      throw new NotFoundException();
    }
    if (asteUserHasAnalysisAccess(this.config, this.userEmail(context))) {
      return true;
    }
    throw new NotFoundException();
  }

  private userEmail(context: ExecutionContext): string | undefined {
    return context.switchToHttp().getRequest<AsteReq>().user?.email;
  }
}
