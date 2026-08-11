import {
  CanActivate,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';

/**
 * EC-S-T24 — seller nudge routes reuse T23's `SELLER_ANALYTICS_ENABLED`.
 * 404 when the shared flag is off (do not invent SELLER_NUDGES_ENABLED).
 */
@Injectable()
export class SellerNudgesEnabledGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  canActivate(): boolean {
    if (!this.config.SELLER_ANALYTICS_ENABLED) {
      throw new NotFoundException();
    }
    return true;
  }
}
