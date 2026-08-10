import {
  CanActivate,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';

/** EC-S-T14 — Verified Owner routes return 404 when flag is off. */
@Injectable()
export class VerifiedOwnerEnabledGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  canActivate(): boolean {
    if (!this.config.VERIFIED_OWNER_ENABLED) {
      throw new NotFoundException();
    }
    return true;
  }
}
