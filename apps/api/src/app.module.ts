import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { SeamsModule } from './config/adapters/seams.module';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { ListingsModule } from './listings/listings.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { UsersModule } from './users/users.module';
import { MediaModule } from './media/media.module';
import { AdminModule } from './admin/admin.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PartnersModule } from './partners/partners.module';
import { MessagingModule } from './messaging/messaging.module';
import { BillingModule } from './billing/billing.module';
import { FeaturedModule } from './featured/featured.module';
import { FascicoloModule } from './fascicolo/fascicolo.module';
import { ServiceCatalogModule } from './service-catalog/service-catalog.module';
import { PropertiesModule } from './properties/properties.module';
import { OrdersModule } from './orders/orders.module';
import { MandateModule } from './mandate/mandate.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { ProfessionalMeModule } from './professional-me/professional-me.module';
import { RentalsModule } from './rentals/rentals.module';
import { AmlModule } from './aml/aml.module';
import { PaymentsModule } from './payments/payments.module';
import { InvoicingModule } from './invoicing/invoicing.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { AlertsModule } from './alerts/alerts.module';
import { EnquiriesModule } from './enquiries/enquiries.module';
import { AvmModule } from './avm/avm.module';
import { ViewingsModule } from './viewings/viewings.module';

/**
 * Composition root — single manifest for every feature module.
 *
 * Phase 33: `ConfigModule` + `SeamsModule` surface validated env into DI;
 * `/health` reports seam configuration. Guards stay on `AuthModule`.
 */
@Module({
  imports: [
    // platform + config seams (Phase 33)
    ConfigModule,
    SeamsModule,
    DbModule,
    AuthModule,
    UsersModule,
    NotificationsModule,
    // discovery & media
    ListingsModule,
    TaxonomyModule,
    MediaModule,
    SearchModule,
    SavedSearchesModule,
    AlertsModule,
    // marketplace / partners
    PartnersModule,
    MessagingModule,
    BillingModule,
    FeaturedModule,
    AdminModule,
    // transaction & compliance spine (P8–12)
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
    // payments & invoicing (P17)
    PaymentsModule,
    InvoicingModule,
    // funnel / valuation / viewings (P24–29)
    EnquiriesModule,
    AvmModule,
    ViewingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
