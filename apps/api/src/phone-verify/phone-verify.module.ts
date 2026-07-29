import { Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { PhoneVerifyController } from './phone-verify.controller';
import { PhoneVerifyService } from './phone-verify.service';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';

@Module({
  imports: [UsersModule, EmailModule],
  controllers: [PhoneVerifyController],
  providers: [PhoneVerifyService, WhatsAppCloudClient],
  exports: [PhoneVerifyService],
})
export class PhoneVerifyModule {}
