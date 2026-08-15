import { Module, forwardRef } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing.webhook.controller';
import { UsersModule } from '../users/users.module';
import { ListingBoostModule } from '../listing-boost/listing-boost.module';
import { SearchModule } from '../search/search.module';
import { AsteModule } from '../aste/aste.module';

@Module({
  imports: [UsersModule, ListingBoostModule, SearchModule, forwardRef(() => AsteModule)],
  providers: [StripeService],
  controllers: [BillingController, BillingWebhookController],
  exports: [StripeService],
})
export class BillingModule {}
