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
  ],
  controllers: [HealthController],
})
export class AppModule {}
