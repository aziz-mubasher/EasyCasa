import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PartnersModule } from '../partners/partners.module';

@Module({
  imports: [UsersModule, NotificationsModule, PartnersModule],
  controllers: [MessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}
