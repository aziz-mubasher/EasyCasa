import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CRM_DORMANT_RETENTION_MONTHS_DEFAULT } from '@easycasa/shared';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { CRM_REPOSITORY, type CrmRepository } from './domain/ports';

/** Anonymise dormant seekers after configurable months (default 24). */
@Injectable()
export class CrmRetentionScheduler implements OnModuleInit {
  private readonly logger = new Logger(CrmRetentionScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(CRM_REPOSITORY) private readonly repo: CrmRepository,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  onModuleInit(): void {
    if (!this.config.CRM_ENABLED) return;
    // Daily
    this.timer = setInterval(() => {
      void this.runOnce();
    }, 24 * 60 * 60 * 1000);
    void this.runOnce();
  }

  async runOnce(): Promise<number> {
    if (!this.config.CRM_ENABLED) return 0;
    const months =
      this.config.CRM_DORMANT_RETENTION_MONTHS ?? CRM_DORMANT_RETENTION_MONTHS_DEFAULT;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const dormant = await this.repo.listDormantSeekersBefore(cutoff);
    for (const row of dormant) {
      await this.repo.anonymizeContact(row.contactId);
      await this.repo.audit({
        actorAdminId: null,
        action: 'retention_anonymize',
        entityType: 'crm_contact',
        entityId: row.contactId,
        detail: { months, cutoff: cutoff.toISOString() },
      });
    }
    if (dormant.length > 0) {
      this.logger.log(`CRM retention: anonymized ${dormant.length} dormant contacts`);
    }
    return dormant.length;
  }
}
