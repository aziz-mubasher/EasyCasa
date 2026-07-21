import { DynamicModule, Module, type Provider } from '@nestjs/common';

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

export interface PrivacyModuleOptions {
  /** Modules that export bindings the privacy services need (e.g. UsersModule). */
  imports?: DynamicModule['imports'];
  /**
   * App-supplied bindings, registered in THIS module's scope so privacy
   * services can inject them (39.1 consolidation finding — parent providers
   * are not visible to an imported module).
   */
  providers: Provider[];
}

/**
 * Privacy module (GDPR) — Phase 38, made composable in 39.1.
 *
 * `forRoot` registers data-subject services + controller **together with**
 * the app-supplied source/store providers in a single module scope.
 * Production uses {@link PrivacyModule.forRootProduction}; consolidation
 * stubs stores without Drizzle.
 */
@Module({})
export class PrivacyModule {
  static forRoot(options: PrivacyModuleOptions): DynamicModule {
    return {
      module: PrivacyModule,
      global: true,
      imports: options.imports ?? [],
      controllers: [DataSubjectController],
      providers: [
        DsarService,
        ErasureService,
        ConsentService,
        RetentionService,
        ...options.providers,
      ],
      exports: [DsarService, ErasureService, ConsentService, RetentionService],
    };
  }

  /** Production wiring — Drizzle stores + PersonalDataRegistry plug-ins. */
  static forRootProduction(): DynamicModule {
    return PrivacyModule.forRoot({
      imports: [UsersModule],
      providers: [
        { provide: CONSENT_STORE, useClass: DrizzleConsentStore },
        { provide: RETENTION_SINK, useClass: DrizzleRetentionSink },
        RetentionScheduler,
        PersonalDataRegistry,
        EnquiriesDataSource,
        ViewingsDataSource,
        SavedSearchesDataSource,
        ProfileDataSource,
        ConsentLedgerDataSource,
        PersonalDataRegistrar,
      ],
    });
  }
}
