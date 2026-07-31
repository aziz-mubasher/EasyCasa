import { Global, Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { UsersModule } from '../users/users.module';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';
import { WhatsAppInboundAdminController } from './whatsapp-inbound-admin.controller';
import { WhatsAppInboundAdminService } from './whatsapp-inbound-admin.service';
import { WhatsAppInboundService } from './whatsapp-inbound.service';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppUnmatchedSendersGauge } from './whatsapp-unmatched-senders.gauge';
import { WhatsAppWebhookController } from './whatsapp.webhook.controller';

/** K EC 7.1 Phase A + EC-17 inbound + EC-19 admin viewer + EC-19b DSAR match. */
@Global()
@Module({
  imports: [AuthorityModule, UsersModule],
  controllers: [WhatsAppWebhookController, WhatsAppInboundAdminController],
  providers: [
    WhatsAppCloudClient,
    WhatsAppInboundService,
    WhatsAppInboundAdminService,
    WhatsAppService,
    WhatsAppUnmatchedSendersGauge,
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
