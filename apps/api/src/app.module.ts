import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { SeamsModule } from './config/adapters/seams.module';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { AuthorityModule } from './authority/authority.module';
import { EmailModule } from './email/email.module';
import { HealthController } from './health/health.controller';
import { VersionController } from './health/version.controller';
import { ListingsModule } from './listings/listings.module';
import { ImportsModule } from './imports/imports.module';
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
import { AsteModule } from './aste/aste.module';
import { AvmModule } from './avm/avm.module';
import { ViewingsModule } from './viewings/viewings.module';
import { ShareLinksModule } from './share-links/share-links.module';
import { ListingDraftsModule } from './listing-drafts/listing-drafts.module';
import { OmiModule } from './omi/omi.module';
import { SellerModule } from './seller/seller.module';
import { VerifiedOwnerModule } from './verified-owner/verified-owner.module';
import { SellerChecklistModule } from './seller-checklist/seller-checklist.module';
import { SellerInboxModule } from './seller-inbox/seller-inbox.module';
import { PilotModule } from './pilot/pilot.module';
import { DemoModule } from './demo/demo.module';
import { PrivacyModule } from './privacy/privacy.module';
import { PhoneVerifyModule } from './phone-verify/phone-verify.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ObservabilityModule } from './observability/observability.module';
import { CrmModule } from './crm/crm.module';
import { HealthIndicatorRegistry } from './health/health-indicator.registry';
import { EmailHealthIndicator } from './health/email.health';
import { MeiliHealthIndicator } from './health/meili.health';
import { PostgresHealthIndicator } from './health/postgres.health';
import { ReadinessController } from './health/readiness.controller';
import { RedisHealthIndicator } from './health/redis.health';

/**
 * Composition root — single manifest for every feature module.
 *
 * Phases 32–39.1: Config + Seams + Auth + Email + observability + privacy.forRoot;
 * feature modules below. Auth guards stay on `AuthModule` only. `/health` is `@Public`.
 * Readiness indicators register at the root (39.1 consolidation finding).
 */
@Module({
  imports: [
    // platform + config seams (Phase 33) + email (Phase 36) + observability (Phase 39)
    ConfigModule,
    SeamsModule,
    DbModule,
    AuthModule,
    AuthorityModule,
    EmailModule,
    ObservabilityModule,
    PrivacyModule.forRootProduction(),
    UsersModule,
    NotificationsModule,
    // discovery & media
    ListingsModule,
    ImportsModule,
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
    // funnel / valuation / viewings (P24–29) + pilot seed (P37)
    EnquiriesModule,
    AsteModule,
    AvmModule,
    ViewingsModule,
    ShareLinksModule,
    WhatsAppModule,
    PhoneVerifyModule,
    ListingDraftsModule,
    OmiModule,
    SellerModule,
    VerifiedOwnerModule,
    SellerChecklistModule,
    SellerInboxModule,
    PilotModule,
    DemoModule,
    CrmModule,
  ],
  controllers: [HealthController, ReadinessController, VersionController],
  providers: [
    HealthIndicatorRegistry,
    PostgresHealthIndicator,
    MeiliHealthIndicator,
    RedisHealthIndicator,
    EmailHealthIndicator,
  ],
})
export class AppModule {}
