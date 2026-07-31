import { Global, Module } from '@nestjs/common';

import { WhatsAppCloudClient } from './whatsapp-cloud.client';
import { WhatsAppInboundService } from './whatsapp-inbound.service';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookController } from './whatsapp.webhook.controller';

/** K EC 7.1 Phase A + EC-17 inbound. */
@Global()
@Module({
  controllers: [WhatsAppWebhookController],
  providers: [WhatsAppCloudClient, WhatsAppInboundService, WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
