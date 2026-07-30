import { Global, Module } from '@nestjs/common';

import { WhatsAppCloudClient } from './whatsapp-cloud.client';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookController } from './whatsapp.webhook.controller';

/** K EC 7.1 Phase A — shared WhatsApp Cloud integration. */
@Global()
@Module({
  controllers: [WhatsAppWebhookController],
  providers: [WhatsAppCloudClient, WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
