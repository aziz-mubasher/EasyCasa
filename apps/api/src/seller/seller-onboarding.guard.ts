import {
  CanActivate,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';

/** EC-S-T06 — seller onboarding routes return 404 when flag is off. */
@Injectable()
export class SellerOnboardingEnabledGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  canActivate(): boolean {
    if (!this.config.SELLER_ONBOARDING_ENABLED) {
      throw new NotFoundException();
    }
    return true;
  }
}
