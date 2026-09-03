import { Module, forwardRef } from '@nestjs/common';

import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import { AuthorityModule } from '../authority/authority.module';
import { BillingModule } from '../billing/billing.module';
import { OmiModule } from '../omi/omi.module';
import { AsteAnalysesDataSource } from '../privacy/sources/aste-analyses.data-source';
import { AsteChatMessagesDataSource } from '../privacy/sources/aste-chat-messages.data-source';
import { UsersModule } from '../users/users.module';
import { AsteAdminController } from './aste-admin.controller';
import { AsteAdminService } from './aste-admin.service';
import { AsteCreditsController, AsteUnlockController } from './aste-credits.controller';
import { AsteCreditsService } from './aste-credits.service';
import { AsteTrialService } from './aste-trial.service';
import { AsteTrialRetentionScheduler } from './aste-trial-retention.scheduler';
import { AsteAnalysisController } from './aste-analysis.controller';
import { AsteAnalysisEnabledGuard } from './aste-analysis.guard';
import { AsteMonetisationEnabledGuard } from './aste-monetisation.guard';
import { AsteAnalysisService } from './aste-analysis.service';
import { AsteAiClient } from './aste-ai.client';
import { AsteChatRetrievalService } from './aste-chat-retrieval.service';
import { AsteChatService } from './aste-chat.service';
import { AsteController } from './aste.controller';
import { AsteDocsRetentionScheduler } from './aste-docs-retention.scheduler';
import { AsteOmiCheckService } from './aste-omi-check.service';
import { AstePipelineScheduler } from './aste-pipeline.scheduler';
import { AstePipelineService } from './aste-pipeline.service';
import { AstePrivacyBoot } from './aste-privacy-boot';
import { AsteReportService } from './aste-report.service';
import { AsteService } from './aste.service';
import { AsteStorage } from './aste-storage';

@Module({
  imports: [UsersModule, OmiModule, AuthorityModule, forwardRef(() => BillingModule)],
  controllers: [
    AsteController,
    AsteAnalysisController,
    AsteAdminController,
    AsteCreditsController,
    AsteUnlockController,
  ],
  providers: [
    AsteService,
    AsteAnalysisService,
    AsteAdminService,
    AsteReportService,
    AsteCreditsService,
    AsteTrialService,
    AsteTrialRetentionScheduler,
    AsteChatService,
    AsteChatRetrievalService,
    AsteOmiCheckService,
    AsteStorage,
    AsteAiClient,
    AstePipelineService,
    AstePipelineScheduler,
    AsteAnalysisEnabledGuard,
    AsteMonetisationEnabledGuard,
    AsteDocsRetentionScheduler,
    AsteAnalysesDataSource,
    AsteChatMessagesDataSource,
    AstePrivacyBoot,
    ProductAnalyticsService,
  ],
  exports: [
    AsteService,
    AsteAnalysisService,
    AstePipelineService,
    AsteReportService,
    AsteChatService,
    AsteCreditsService,
    AsteTrialService,
  ],
})
export class AsteModule {}
