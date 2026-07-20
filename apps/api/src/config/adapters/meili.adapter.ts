import { Injectable } from '@nestjs/common';

import type { ApiConfig } from '../load';
import { InjectConfig } from '../inject-config.decorator';
import type { SeamStatus } from './seam';

/** Meilisearch seam (Phase 20) — host has a schema default, so usually ready. */
@Injectable()
export class MeiliAdapter {
  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  status(): SeamStatus {
    return {
      name: 'meili',
      configured: Boolean(this.config.MEILI_URL),
      requires: ['MEILI_URL', 'MEILI_MASTER_KEY'],
    };
  }

  get host(): string {
    return this.config.MEILI_URL;
  }

  get apiKey(): string {
    return this.config.MEILI_MASTER_KEY;
  }
}
