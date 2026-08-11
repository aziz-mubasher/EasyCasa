import {
  CanActivate,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';

/** EC-S-T21/T22 — seller viewing routes return 404 when flag is off. */
@Injectable()
export class SellerViewingsEnabledGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  canActivate(): boolean {
    if (!this.config.SELLER_VIEWINGS_ENABLED) {
      throw new NotFoundException();
    }
    return true;
  }
}
