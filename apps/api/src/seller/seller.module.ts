import { Module } from '@nestjs/common';

import { SellerQuotaModule } from '../seller-quota/seller-quota.module';
import { UsersModule } from '../users/users.module';
import { SellerConsentGuard } from './seller-consent.guard';
import { SellerController } from './seller.controller';
import { SellerOnboardingEnabledGuard } from './seller-onboarding.guard';
import { SellerService } from './seller.service';

@Module({
  imports: [UsersModule, SellerQuotaModule],
  controllers: [SellerController],
  providers: [SellerService, SellerOnboardingEnabledGuard, SellerConsentGuard],
  exports: [SellerService, SellerOnboardingEnabledGuard, SellerConsentGuard],
})
export class SellerModule {}
