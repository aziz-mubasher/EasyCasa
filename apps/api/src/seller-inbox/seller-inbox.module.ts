import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { SellerModule } from '../seller/seller.module';
import { SellerInboxController } from './seller-inbox.controller';
import { SellerInboxEnabledGuard } from './seller-inbox.guard';
import { SellerInboxService } from './seller-inbox.service';

@Module({
  imports: [UsersModule, SellerModule],
  controllers: [SellerInboxController],
  providers: [SellerInboxService, SellerInboxEnabledGuard],
  exports: [SellerInboxService],
})
export class SellerInboxModule {}
