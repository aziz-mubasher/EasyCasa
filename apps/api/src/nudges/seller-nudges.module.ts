import { Module } from '@nestjs/common';

import { OmiModule } from '../omi/omi.module';
import { UsersModule } from '../users/users.module';
import { SellerOnboardingEnabledGuard } from '../seller/seller-onboarding.guard';
import { SellerNudgesController } from './seller-nudges.controller';
import { SellerNudgesEnabledGuard } from './seller-nudges.guard';
import { SellerNudgesScheduler } from './seller-nudges.scheduler';
import { SellerNudgesService } from './seller-nudges.service';

@Module({
  imports: [UsersModule, OmiModule],
  controllers: [SellerNudgesController],
  providers: [
    SellerNudgesService,
    SellerNudgesEnabledGuard,
    SellerOnboardingEnabledGuard,
    SellerNudgesScheduler,
  ],
  exports: [SellerNudgesService],
})
export class SellerNudgesModule {}
