import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import type { ApiConfig } from '../load';
import { InjectConfig } from '../inject-config.decorator';
import type { SeamStatus } from './seam';

/** RLI (rental registration) channel seam (Phase 12). */
@Injectable()
export class RliAdapter {
  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  status(): SeamStatus {
    return {
      name: 'rli',
      configured: Boolean(this.config.RLI_CHANNEL_URL && this.config.RLI_CHANNEL_CREDENTIAL),
      requires: ['RLI_CHANNEL_URL', 'RLI_CHANNEL_CREDENTIAL'],
    };
  }

  endpoint(): string {
    if (!this.config.RLI_CHANNEL_URL) throw new ServiceUnavailableException('RLI not configured');
    return this.config.RLI_CHANNEL_URL;
  }
}
