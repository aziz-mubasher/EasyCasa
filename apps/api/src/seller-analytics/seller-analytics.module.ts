import { Module } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { OmiModule } from '../omi/omi.module';
import { SellerModule } from '../seller/seller.module';
import { SellerQuotaModule } from '../seller-quota/seller-quota.module';
import { UsersModule } from '../users/users.module';
import { SellerAnalyticsController } from './seller-analytics.controller';
import { SellerAnalyticsEnabledGuard } from './seller-analytics.guard';
import { SellerAnalyticsService } from './seller-analytics.service';

@Module({
  imports: [DbModule, UsersModule, SellerModule, OmiModule, SellerQuotaModule],
  controllers: [SellerAnalyticsController],
  providers: [SellerAnalyticsService, SellerAnalyticsEnabledGuard],
  exports: [SellerAnalyticsService],
})
export class SellerAnalyticsModule {}
