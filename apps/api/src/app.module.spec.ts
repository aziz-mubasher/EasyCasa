import { MODULE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { AppModule } from './app.module';
import { AuthModule } from './auth/auth.module';
import { AlertsModule } from './alerts/alerts.module';
import { AmlModule } from './aml/aml.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AvmModule } from './avm/avm.module';
import { BillingModule } from './billing/billing.module';
import { DbModule } from './db/db.module';
import { EnquiriesModule } from './enquiries/enquiries.module';
import { FascicoloModule } from './fascicolo/fascicolo.module';
import { FeaturedModule } from './featured/featured.module';
import { InvoicingModule } from './invoicing/invoicing.module';
import { ListingsModule } from './listings/listings.module';
import { MandateModule } from './mandate/mandate.module';
import { MediaModule } from './media/media.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { PartnersModule } from './partners/partners.module';
import { PaymentsModule } from './payments/payments.module';
import { ProfessionalMeModule } from './professional-me/professional-me.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { PropertiesModule } from './properties/properties.module';
import { RentalsModule } from './rentals/rentals.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { SearchModule } from './search/search.module';
import { ServiceCatalogModule } from './service-catalog/service-catalog.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { UsersModule } from './users/users.module';
import { ViewingsModule } from './viewings/viewings.module';
import { AdminModule } from './admin/admin.module';

/** Every Nest feature module the composition root must import (Phase 32). */
const REQUIRED = [
  DbModule,
  AuthModule,
  UsersModule,
  ListingsModule,
  TaxonomyModule,
  MediaModule,
  AdminModule,
  SearchModule,
  NotificationsModule,
  PartnersModule,
  MessagingModule,
  BillingModule,
  FeaturedModule,
  ServiceCatalogModule,
  PropertiesModule,
  FascicoloModule,
  OrdersModule,
  MandateModule,
  ProfessionalsModule,
  AssignmentsModule,
  ProfessionalMeModule,
  RentalsModule,
  AmlModule,
  PaymentsModule,
  InvoicingModule,
  SavedSearchesModule,
  AlertsModule,
  EnquiriesModule,
  AvmModule,
  ViewingsModule,
] as const;

describe('AppModule composition root (Phase 32)', () => {
  it('imports every feature module (no orphaned phases)', () => {
    const imported = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as unknown[];
    expect(imported).toEqual(expect.arrayContaining([...REQUIRED]));
    expect(imported).toHaveLength(REQUIRED.length);
  });

  it('keeps APP_GUARD registration on AuthModule only (no double guards)', () => {
    const appProviders =
      (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule) as unknown[] | undefined) ?? [];
    expect(appProviders).toHaveLength(0);

    const authProviders = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AuthModule) as unknown[];
    expect(authProviders?.length).toBeGreaterThanOrEqual(2);
  });

  it('OrdersModule exports OrdersService for the enquiry bridge', async () => {
    const { OrdersService } = await import('./orders/orders.service');
    const exported = Reflect.getMetadata(MODULE_METADATA.EXPORTS, OrdersModule) as unknown[];
    expect(exported).toEqual(expect.arrayContaining([OrdersService]));
  });
});
