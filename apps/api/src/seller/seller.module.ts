import { Module } from '@nestjs/common';

import { SellerQuotaModule } from '../seller-quota/seller-quota.module';
import { UsersModule } from '../users/users.module';
import { SellerController } from './seller.controller';
import { SellerOnboardingEnabledGuard } from './seller-onboarding.guard';
import { SellerService } from './seller.service';

@Module({
  imports: [UsersModule, SellerQuotaModule],
  controllers: [SellerController],
  providers: [SellerService, SellerOnboardingEnabledGuard],
  exports: [SellerService, SellerOnboardingEnabledGuard],
})
export class SellerModule {}
