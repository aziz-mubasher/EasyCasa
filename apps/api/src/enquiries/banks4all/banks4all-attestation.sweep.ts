import { Inject, Injectable, Logger } from '@nestjs/common';

import { BANKS4ALL_PORT, type Banks4AllPort } from './banks4all.port';
import {
  ENQUIRY_REPOSITORY,
  type EnquiryRepository,
} from '../domain/ports';

/**
 * Nightly re-verify of cached Banks4All tokens (EC-1 revocation).
 * 404/401 → clear four columns. Network error → leave alone.
 */
@Injectable()
export class Banks4AllAttestationSweep {
  private readonly logger = new Logger(Banks4AllAttestationSweep.name);

  constructor(
    @Inject(ENQUIRY_REPOSITORY) private readonly repo: EnquiryRepository,
    @Inject(BANKS4ALL_PORT) private readonly banks4all: Banks4AllPort,
  ) {}

  async runOnce(): Promise<{ checked: number; cleared: number; refreshed: number }> {
    const due = await this.repo.listBanks4AllDueForSweep();
    let cleared = 0;
    let refreshed = 0;

    for (const row of due) {
      if (!row.b4aToken) continue;
      const outcome = await this.banks4all.verify(row.b4aToken);
      if (!outcome.ok) {
        if (outcome.reason === 'not_found') {
          await this.repo.clearBanks4All(row.id);
          cleared += 1;
        }
        continue;
      }
      await this.repo.setBanks4All(row.id, {
        b4aToken: row.b4aToken,
        b4aBandMaxCents: outcome.attestation.bandMaxCents,
        b4aExpiresAt: outcome.attestation.expiresAt,
        b4aCheckedAt: new Date(),
      });
      refreshed += 1;
    }

    this.logger.log(
      `banks4all sweep: due=${due.length} cleared=${cleared} refreshed=${refreshed}`,
    );
    return { checked: due.length, cleared, refreshed };
  }
}
