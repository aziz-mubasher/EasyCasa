import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing.webhook.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [StripeService],
  controllers: [BillingController, BillingWebhookController],
  exports: [StripeService],
})
export class BillingModule {}
