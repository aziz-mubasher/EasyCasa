import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import type { ApiConfig } from '../load';
import { InjectConfig } from '../inject-config.decorator';
import type { SeamStatus } from './seam';

/** Payment service provider seam (Phase 17). */
@Injectable()
export class PspAdapter {
  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  status(): SeamStatus {
    return {
      name: 'psp',
      configured: Boolean(this.config.PSP_API_URL && this.config.PSP_SECRET_KEY),
      requires: ['PSP_API_URL', 'PSP_SECRET_KEY'],
    };
  }

  endpoint(): { url: string; key: string } {
    const { PSP_API_URL: url, PSP_SECRET_KEY: key } = this.config;
    if (!url || !key) throw new ServiceUnavailableException('payments not configured');
    return { url, key };
  }
}
