import { Global, Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { UsersModule } from '../users/users.module';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';
import { WhatsAppInboundAdminController } from './whatsapp-inbound-admin.controller';
import { WhatsAppInboundAdminService } from './whatsapp-inbound-admin.service';
import { WhatsAppInboundService } from './whatsapp-inbound.service';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookController } from './whatsapp.webhook.controller';

/** K EC 7.1 Phase A + EC-17 inbound + EC-19 admin viewer. */
@Global()
@Module({
  imports: [AuthorityModule, UsersModule],
  controllers: [WhatsAppWebhookController, WhatsAppInboundAdminController],
  providers: [
    WhatsAppCloudClient,
    WhatsAppInboundService,
    WhatsAppInboundAdminService,
    WhatsAppService,
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
