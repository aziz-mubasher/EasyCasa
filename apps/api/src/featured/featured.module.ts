import { Module } from '@nestjs/common';
import { FeaturedController } from './featured.controller';
import { BillingModule } from '../billing/billing.module';

@Module({ imports: [BillingModule], controllers: [FeaturedController] })
export class FeaturedModule {}
