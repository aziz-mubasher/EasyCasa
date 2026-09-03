import { Global, Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { UsersModule } from '../users/users.module';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';
import { WhatsAppHubController } from './whatsapp-hub.controller';
import { WhatsAppHubService } from './whatsapp-hub.service';
import { WhatsAppInboundAdminController } from './whatsapp-inbound-admin.controller';
import { WhatsAppInboundAdminService } from './whatsapp-inbound-admin.service';
import { WhatsAppInboundService } from './whatsapp-inbound.service';
import { WhatsAppJourneyService } from './whatsapp-journey.service';
import { WhatsAppMessagesStore } from './whatsapp-messages.store';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppUnmatchedSendersGauge } from './whatsapp-unmatched-senders.gauge';
import { WhatsAppWebhookController } from './whatsapp.webhook.controller';

/** K EC 7.1 + EC-16 + EC-17 inbound + EC-19 viewer + K EC 7.4 channel / Hub. */
@Global()
@Module({
  imports: [AuthorityModule, UsersModule],
  controllers: [WhatsAppWebhookController, WhatsAppInboundAdminController, WhatsAppHubController],
  providers: [
    WhatsAppCloudClient,
    WhatsAppMessagesStore,
    WhatsAppInboundService,
    WhatsAppInboundAdminService,
    WhatsAppJourneyService,
    WhatsAppHubService,
    WhatsAppService,
    WhatsAppUnmatchedSendersGauge,
  ],
  exports: [WhatsAppService, WhatsAppMessagesStore],
})
export class WhatsAppModule {}
