import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { CONSENT_STORE, ConsentService } from './consent.service';
import { DataSubjectController } from './data-subject.controller';
import { DsarService } from './dsar.service';
import { ErasureService } from './erasure.service';
import { PersonalDataRegistrar } from './personal-data.registrar';
import { PersonalDataRegistry } from './personal-data.registry';
import { RETENTION_SINK, RetentionService } from './retention.service';
import { RetentionScheduler } from './retention.scheduler';
import { ConsentLedgerDataSource } from './sources/consent-ledger.data-source';
import { EnquiriesDataSource } from './sources/enquiries.data-source';
import { ProfileDataSource } from './sources/profile.data-source';
import { SavedSearchesDataSource } from './sources/saved-searches.data-source';
import { ViewingsDataSource } from './sources/viewings.data-source';
import { DrizzleConsentStore } from './stores/drizzle-consent.store';
import { DrizzleRetentionSink } from './stores/drizzle-retention.sink';

/**
 * Privacy module (GDPR) — Phase 38.
 * Wires DSAR / erasure / consent / retention with Drizzle-backed stores and
 * PersonalDataSource plug-ins registered via {@link PersonalDataRegistry}.
 */
@Module({
  imports: [UsersModule],
  controllers: [DataSubjectController],
  providers: [
    { provide: CONSENT_STORE, useClass: DrizzleConsentStore },
    { provide: RETENTION_SINK, useClass: DrizzleRetentionSink },
    ConsentService,
    RetentionService,
    RetentionScheduler,
    PersonalDataRegistry,
    EnquiriesDataSource,
    ViewingsDataSource,
    SavedSearchesDataSource,
    ProfileDataSource,
    ConsentLedgerDataSource,
    DsarService,
    ErasureService,
    PersonalDataRegistrar,
  ],
  exports: [ConsentService, DsarService, ErasureService, RetentionService],
})
export class PrivacyModule {}
