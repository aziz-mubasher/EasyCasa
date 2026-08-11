import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { SellerOnboardingEnabledGuard } from '../seller/seller-onboarding.guard';
import { SellerInboxController } from './seller-inbox.controller';
import { SellerInboxEnabledGuard } from './seller-inbox.guard';
import { SellerInboxService } from './seller-inbox.service';

@Module({
  imports: [UsersModule],
  controllers: [SellerInboxController],
  providers: [SellerInboxService, SellerInboxEnabledGuard, SellerOnboardingEnabledGuard],
  exports: [SellerInboxService],
})
export class SellerInboxModule {}
