import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing.webhook.controller';
import { UsersModule } from '../users/users.module';
import { ListingBoostModule } from '../listing-boost/listing-boost.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [UsersModule, ListingBoostModule, SearchModule],
  providers: [StripeService],
  controllers: [BillingController, BillingWebhookController],
  exports: [StripeService],
})
export class BillingModule {}
