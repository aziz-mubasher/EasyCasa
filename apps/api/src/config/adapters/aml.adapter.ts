import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import type { ApiConfig } from '../load';
import { InjectConfig } from '../inject-config.decorator';
import type { SeamStatus } from './seam';

/** AML screening seam (Phase 12). */
@Injectable()
export class AmlAdapter {
  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  status(): SeamStatus {
    return {
      name: 'aml',
      configured: Boolean(this.config.AML_SCREENING_URL && this.config.AML_SCREENING_KEY),
      requires: ['AML_SCREENING_URL', 'AML_SCREENING_KEY'],
    };
  }

  endpoint(): string {
    if (!this.config.AML_SCREENING_URL) throw new ServiceUnavailableException('AML not configured');
    return this.config.AML_SCREENING_URL;
  }
}
