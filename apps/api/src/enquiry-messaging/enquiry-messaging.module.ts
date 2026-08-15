import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EnquiryMessagingController } from './enquiry-messaging.controller';
import { EnquiryMessagingService } from './enquiry-messaging.service';
import { SellerMessagingEnabledGuard } from './seller-messaging.guard';

@Module({
  imports: [UsersModule, NotificationsModule],
  controllers: [EnquiryMessagingController],
  providers: [EnquiryMessagingService, SellerMessagingEnabledGuard],
  exports: [EnquiryMessagingService],
})
export class EnquiryMessagingModule {}
