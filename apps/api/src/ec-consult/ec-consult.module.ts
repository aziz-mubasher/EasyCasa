import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { EcConsultAdminController } from './ec-consult-admin.controller';
import { EcConsultCallbackService } from './ec-consult-callback.service';
import { EcConsultKbSyncService } from './ec-consult-kb-sync.service';
import { EcConsultMemoryStore } from './ec-consult-memory.store';
import { EcConsultOrchestratorService } from './ec-consult-orchestrator.service';
import { EcConsultWebhookService } from './ec-consult-webhook.service';

@Module({
  imports: [UsersModule],
  controllers: [EcConsultAdminController],
  providers: [
    EcConsultMemoryStore,
    EcConsultKbSyncService,
    EcConsultOrchestratorService,
    EcConsultWebhookService,
    EcConsultCallbackService,
  ],
  exports: [EcConsultWebhookService, EcConsultOrchestratorService, EcConsultCallbackService],
})
export class EcConsultModule {}