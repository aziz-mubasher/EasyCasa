import { CanActivate, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { APP_CONFIG } from '../config/config.module';
import type { ApiConfig } from '../config/load';

@Injectable()
export class PartnerDirectoryEnabledGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  canActivate(): boolean {
    if (!this.config.PARTNER_DIRECTORY_ENABLED) {
      throw new NotFoundException('partner directory not available');
    }
    return true;
  }
}
