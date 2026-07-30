import { Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { PhoneVerifyController } from './phone-verify.controller';
import { PhoneVerifyService } from './phone-verify.service';

@Module({
  imports: [UsersModule, EmailModule, WhatsAppModule],
  controllers: [PhoneVerifyController],
  providers: [PhoneVerifyService],
  exports: [PhoneVerifyService],
})
export class PhoneVerifyModule {}
