import { Inject, Injectable, OnModuleInit } from '@nestjs/common';

import { DsarService } from './dsar.service';
import { ErasureService } from './erasure.service';
import { PersonalDataRegistry } from './personal-data.registry';
import { ConsentLedgerDataSource } from './sources/consent-ledger.data-source';
import { EnquiriesDataSource } from './sources/enquiries.data-source';
import { ProfileDataSource } from './sources/profile.data-source';
import { SavedSearchesDataSource } from './sources/saved-searches.data-source';
import { ViewingsDataSource } from './sources/viewings.data-source';

/** Registers all PersonalDataSource implementations into the registry at boot. */
@Injectable()
export class PersonalDataRegistrar implements OnModuleInit {
  constructor(
    @Inject(PersonalDataRegistry) private readonly registry: PersonalDataRegistry,
    @Inject(EnquiriesDataSource) private readonly enquiries: EnquiriesDataSource,
    @Inject(ViewingsDataSource) private readonly viewings: ViewingsDataSource,
    @Inject(SavedSearchesDataSource) private readonly savedSearches: SavedSearchesDataSource,
    @Inject(ProfileDataSource) private readonly profile: ProfileDataSource,
    @Inject(ConsentLedgerDataSource) private readonly consent: ConsentLedgerDataSource,
    @Inject(DsarService) private readonly dsar: DsarService,
    @Inject(ErasureService) private readonly erasure: ErasureService,
  ) {}

  onModuleInit(): void {
    for (const s of [
      this.enquiries,
      this.viewings,
      this.savedSearches,
      this.profile,
      this.consent,
    ]) {
      this.registry.register(s);
    }
    this.dsar.bind(this.registry);
    this.erasure.bind(this.registry);
  }
}
