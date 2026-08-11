import { CanActivate, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { APP_CONFIG } from '../config/config.module';
import type { ApiConfig } from '../config/load';

/** EC-S-T20 — seller inbox routes return 404 when flag is off. */
@Injectable()
export class SellerInboxEnabledGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  canActivate(): boolean {
    if (!this.config.SELLER_INBOX_ENABLED) {
      throw new NotFoundException();
    }
    return true;
  }
}
