import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { SellerController } from './seller.controller';
import { SellerOnboardingEnabledGuard } from './seller-onboarding.guard';
import { SellerService } from './seller.service';

@Module({
  imports: [UsersModule],
  controllers: [SellerController],
  providers: [SellerService, SellerOnboardingEnabledGuard],
  exports: [SellerService],
})
export class SellerModule {}
