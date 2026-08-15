import { CanActivate, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { APP_CONFIG } from '../config/config.module';
import type { ApiConfig } from '../config/load';

/** EC-S-T25 — enquiry messaging routes return 404 when flag is off. */
@Injectable()
export class SellerMessagingEnabledGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  canActivate(): boolean {
    if (!this.config.SELLER_MESSAGING_ENABLED) {
      throw new NotFoundException();
    }
    return true;
  }
}
