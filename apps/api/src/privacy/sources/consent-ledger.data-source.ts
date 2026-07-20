import { Inject, Injectable } from '@nestjs/common';

import { CONSENT_STORE, type ConsentStore } from '../consent.service';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../personal-data-source';

/**
 * Consent ledger as a DSAR section. Erasure retains the ledger as Art. 7 evidence.
 */
@Injectable()
export class ConsentLedgerDataSource implements PersonalDataSource {
  readonly source = 'consent';

  constructor(@Inject(CONSENT_STORE) private readonly store: ConsentStore) {}

  async collect(subjectId: string): Promise<CollectedData> {
    const records = await this.store.listForSubject(subjectId);
    return { source: this.source, records };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    const records = await this.store.listForSubject(subjectId);
    return {
      source: this.source,
      erased: 0,
      retainedUnderLegalHold: records.length,
      note: 'consent ledger retained as Art. 7 evidence',
    };
  }
}
