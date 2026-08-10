import {
  CanActivate,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';

/** EC-22 — when ASTE_ANALYSIS_ENABLED is false, analysis routes return 404. */
@Injectable()
export class AsteAnalysisEnabledGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  canActivate(): boolean {
    if (!this.config.ASTE_ANALYSIS_ENABLED) {
      throw new NotFoundException();
    }
    return true;
  }
}
