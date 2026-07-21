import { MODULE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { AppModule } from './app.module';
import { AuthModule } from './auth/auth.module';
import { AlertsModule } from './alerts/alerts.module';
import { AmlModule } from './aml/aml.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AvmModule } from './avm/avm.module';
import { BillingModule } from './billing/billing.module';
import { ConfigModule } from './config/config.module';
import { SeamsModule } from './config/adapters/seams.module';
import { DbModule } from './db/db.module';
import { EmailModule } from './email/email.module';
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
import { PilotModule } from './pilot/pilot.module';
import { PrivacyModule } from './privacy/privacy.module';
import { ObservabilityModule } from './observability/observability.module';

/** Static module imports (Privacy is DynamicModule via forRootProduction). */
const REQUIRED_STATIC = [
  ConfigModule,
  SeamsModule,
  DbModule,
  AuthModule,
  EmailModule,
  ObservabilityModule,
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
  PilotModule,
] as const;

function isPrivacyForRoot(entry: unknown): boolean {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'module' in entry &&
    (entry as { module: unknown }).module === PrivacyModule
  );
}

describe('AppModule composition root (Phase 32/39.1)', () => {
  it('imports every feature module (no orphaned phases)', () => {
    const imported = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as unknown[];
    expect(imported).toEqual(expect.arrayContaining([...REQUIRED_STATIC]));
    expect(imported.some(isPrivacyForRoot)).toBe(true);
    expect(imported).toHaveLength(REQUIRED_STATIC.length + 1); // + PrivacyModule.forRootProduction()
  });

  it('keeps Jwt/Roles APP_GUARD registration on AuthModule only (no double auth guards)', () => {
    const appProviders =
      (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule) as unknown[] | undefined) ?? [];
    // Readiness health indicators live on AppModule (39.1); no APP_GUARD here.
    expect(appProviders.length).toBeGreaterThanOrEqual(4);

    const authProviders = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AuthModule) as unknown[];
    expect(authProviders?.length).toBeGreaterThanOrEqual(2);
  });

  it('OrdersModule exports OrdersService for the enquiry bridge', async () => {
    const { OrdersService } = await import('./orders/orders.service');
    const exported = Reflect.getMetadata(MODULE_METADATA.EXPORTS, OrdersModule) as unknown[];
    expect(exported).toEqual(expect.arrayContaining([OrdersService]));
  });
});
