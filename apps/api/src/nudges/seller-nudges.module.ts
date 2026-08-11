import { Module } from '@nestjs/common';

import { OmiModule } from '../omi/omi.module';
import { SellerAnalyticsModule } from '../seller-analytics/seller-analytics.module';
import { UsersModule } from '../users/users.module';
import { SellerModule } from '../seller/seller.module';
import { SellerNudgesController } from './seller-nudges.controller';
import { SellerNudgesEnabledGuard } from './seller-nudges.guard';
import { SellerNudgesScheduler } from './seller-nudges.scheduler';
import { SellerNudgesService } from './seller-nudges.service';

@Module({
  imports: [UsersModule, OmiModule, SellerAnalyticsModule, SellerModule],
  controllers: [SellerNudgesController],
  providers: [
    SellerNudgesService,
    SellerNudgesEnabledGuard,
    SellerNudgesScheduler,
  ],
  exports: [SellerNudgesService],
})
export class SellerNudgesModule {}
