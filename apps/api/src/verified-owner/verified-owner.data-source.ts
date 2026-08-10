import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { verifiedOwnerCase } from '../db/schema';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../privacy/personal-data-source';
import { VerifiedOwnerService } from './verified-owner.service';

/** EC-S-T14 — DSAR/erasure for verified_owner_case + private doc objects. */
@Injectable()
export class VerifiedOwnerDataSource implements PersonalDataSource {
  readonly source = 'verified_owner';

  constructor(
    @Inject(VerifiedOwnerService) private readonly vo: VerifiedOwnerService,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  async collect(subjectId: string): Promise<CollectedData> {
    const rows = await this.db
      .select({
        id: verifiedOwnerCase.id,
        listingId: verifiedOwnerCase.listingId,
        state: verifiedOwnerCase.state,
        nameMatchVerdict: verifiedOwnerCase.nameMatchVerdict,
        createdAt: verifiedOwnerCase.createdAt,
      })
      .from(verifiedOwnerCase)
      .where(eq(verifiedOwnerCase.sellerUserId, subjectId));
    return { source: this.source, records: rows };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    const { erased, keys } = await this.vo.eraseForSubject(subjectId);
    return {
      source: this.source,
      erased,
      retainedUnderLegalHold: 0,
      note: keys ? `deleted ${keys} private doc object(s)` : undefined,
    };
  }
}
