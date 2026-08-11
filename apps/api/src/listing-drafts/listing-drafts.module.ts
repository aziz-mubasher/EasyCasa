import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { ListingsModule } from '../listings/listings.module';
import { SellerQuotaModule } from '../seller-quota/seller-quota.module';
import { SellerOnboardingEnabledGuard } from '../seller/seller-onboarding.guard';
import { ListingDraftsController } from './listing-drafts.controller';
import { ListingDraftsService } from './listing-drafts.service';

@Module({
  imports: [UsersModule, ListingsModule, SellerQuotaModule],
  controllers: [ListingDraftsController],
  providers: [ListingDraftsService, SellerOnboardingEnabledGuard],
  exports: [ListingDraftsService],
})
export class ListingDraftsModule {}
