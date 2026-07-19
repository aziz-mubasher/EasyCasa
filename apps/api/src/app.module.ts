import { Module } from '@nestjs/common';
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
 * Composition root — assembles every phase module into one bootable Nest app.
 * Global JWT + roles guards live on AuthModule (APP_GUARD). Phase 30 productionization
 * checklist: confirm imports resolve, OrdersModule exports OrdersService (enquiry bridge),
 * and /health stays green after each deploy. See docs/phase-30.md.
 */
@Module({
  imports: [
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
