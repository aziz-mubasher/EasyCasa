import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import type { ApiConfig } from '../load';
import { InjectConfig } from '../inject-config.decorator';
import type { SeamStatus } from './seam';

/** SdI e-invoicing channel seam (Phase 17). */
@Injectable()
export class SdiAdapter {
  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  status(): SeamStatus {
    return {
      name: 'sdi',
      configured: Boolean(this.config.SDI_CHANNEL_URL && this.config.SDI_CHANNEL_KEY),
      requires: ['SDI_CHANNEL_URL', 'SDI_CHANNEL_KEY'],
    };
  }

  endpoint(): string {
    if (!this.config.SDI_CHANNEL_URL) throw new ServiceUnavailableException('SdI not configured');
    return this.config.SDI_CHANNEL_URL;
  }
}
