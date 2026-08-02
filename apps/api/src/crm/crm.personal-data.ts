import { Inject, Injectable } from '@nestjs/common';
import { eq, isNull, and } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { crmContacts } from '../db/schema';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../privacy/personal-data-source';
import { CRM_REPOSITORY, type CrmRepository } from './domain/ports';

/** Register CRM rows in the global DSAR/erasure graph (by user_id). */
@Injectable()
export class CrmPersonalDataSource implements PersonalDataSource {
  readonly source = 'crm';

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(CRM_REPOSITORY) private readonly repo: CrmRepository,
  ) {}

  async collect(subjectId: string): Promise<CollectedData> {
    const [contact] = await this.db
      .select()
      .from(crmContacts)
      .where(and(eq(crmContacts.userId, subjectId), isNull(crmContacts.deletedAt)))
      .limit(1);
    if (!contact) return { source: this.source, records: [] };
    const bundle = await this.repo.exportBundle(contact.id);
    return { source: this.source, records: [bundle] };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    const [contact] = await this.db
      .select()
      .from(crmContacts)
      .where(and(eq(crmContacts.userId, subjectId), isNull(crmContacts.deletedAt)))
      .limit(1);
    if (!contact) {
      return { source: this.source, erased: 0, retainedUnderLegalHold: 0 };
    }
    await this.repo.hardDeleteContact(contact.id);
    await this.repo.audit({
      actorAdminId: null,
      action: 'erasure_subject',
      entityType: 'crm_contact',
      entityId: contact.id,
      detail: { subjectUserId: subjectId },
    });
    return { source: this.source, erased: 1, retainedUnderLegalHold: 0 };
  }
}
