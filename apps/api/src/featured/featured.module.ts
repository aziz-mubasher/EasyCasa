import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../users/users.module';
import { FeaturedController } from './featured.controller';

@Module({
  imports: [BillingModule, UsersModule, ListingsModule],
  controllers: [FeaturedController],
})
export class FeaturedModule {}
