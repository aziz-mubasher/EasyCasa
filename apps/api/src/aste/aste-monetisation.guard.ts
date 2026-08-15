import {
  CanActivate,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';

/** EC-27 — credits/checkout/unlock inert unless ASTE_ANALYSIS_ENABLED + PAYMENTS_ENABLED. */
@Injectable()
export class AsteMonetisationEnabledGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  canActivate(): boolean {
    if (!this.config.ASTE_ANALYSIS_ENABLED || !this.config.PAYMENTS_ENABLED) {
      throw new NotFoundException();
    }
    return true;
  }
}
