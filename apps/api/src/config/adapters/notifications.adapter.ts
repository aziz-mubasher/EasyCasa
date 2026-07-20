import { Injectable } from '@nestjs/common';

import type { ApiConfig } from '../load';
import { InjectConfig } from '../inject-config.decorator';
import type { SeamStatus } from './seam';

/** Push/email notification seam (Phase 22/30). */
@Injectable()
export class NotificationsAdapter {
  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  status(): SeamStatus {
    return {
      name: 'notifications',
      configured: Boolean(
        this.config.PUSH_PROVIDER_URL || this.config.EMAIL_PROVIDER_URL || this.config.SMTP_URL,
      ),
      requires: ['PUSH_PROVIDER_URL', 'EMAIL_PROVIDER_URL', 'SMTP_URL'],
    };
  }

  get channels(): { push: boolean; email: boolean } {
    return {
      push: Boolean(this.config.PUSH_PROVIDER_URL),
      email: Boolean(this.config.EMAIL_PROVIDER_URL || this.config.SMTP_URL),
    };
  }
}
