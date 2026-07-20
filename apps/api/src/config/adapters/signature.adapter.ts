import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import type { ApiConfig } from '../load';
import { InjectConfig } from '../inject-config.decorator';
import type { SeamStatus } from './seam';

/** SPID/CIE e-signature provider seam (Phase 10). */
@Injectable()
export class SignatureAdapter {
  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  status(): SeamStatus {
    return {
      name: 'signature',
      configured: Boolean(this.config.SIGNATURE_PROVIDER_URL && this.config.SIGNATURE_PROVIDER_KEY),
      requires: ['SIGNATURE_PROVIDER_URL', 'SIGNATURE_PROVIDER_KEY'],
    };
  }

  endpoint(): string {
    if (!this.config.SIGNATURE_PROVIDER_URL) {
      throw new ServiceUnavailableException('signature provider not configured');
    }
    return this.config.SIGNATURE_PROVIDER_URL;
  }
}
