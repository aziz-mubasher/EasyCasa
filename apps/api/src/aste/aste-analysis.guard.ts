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
 * EC-22 / EC-36 — analysis routes return 404 when dark.
 * Accessible when ASTE_ANALYSIS_ENABLED, or internal preview + allowlisted Keycloak email.
 */
@Injectable()
export class AsteAnalysisEnabledGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  canActivate(context: ExecutionContext): boolean {
    if (asteUserHasAnalysisAccess(this.config, this.userEmail(context))) {
      return true;
    }
    throw new NotFoundException();
  }

  private userEmail(context: ExecutionContext): string | undefined {
    return context.switchToHttp().getRequest<AsteReq>().user?.email;
  }
}
