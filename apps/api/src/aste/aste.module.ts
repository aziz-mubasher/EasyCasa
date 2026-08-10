import { Module } from '@nestjs/common';

import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import { AsteAnalysesDataSource } from '../privacy/sources/aste-analyses.data-source';
import { UsersModule } from '../users/users.module';
import { AsteAnalysisController } from './aste-analysis.controller';
import { AsteAnalysisEnabledGuard } from './aste-analysis.guard';
import { AsteAnalysisService } from './aste-analysis.service';
import { AsteAiClient } from './aste-ai.client';
import { AsteController } from './aste.controller';
import { AsteDocsRetentionScheduler } from './aste-docs-retention.scheduler';
import { AstePipelineScheduler } from './aste-pipeline.scheduler';
import { AstePipelineService } from './aste-pipeline.service';
import { AstePrivacyBoot } from './aste-privacy-boot';
import { AsteService } from './aste.service';
import { AsteStorage } from './aste-storage';

@Module({
  imports: [UsersModule],
  controllers: [AsteController, AsteAnalysisController],
  providers: [
    AsteService,
    AsteAnalysisService,
    AsteStorage,
    AsteAiClient,
    AstePipelineService,
    AstePipelineScheduler,
    AsteAnalysisEnabledGuard,
    AsteDocsRetentionScheduler,
    AsteAnalysesDataSource,
    AstePrivacyBoot,
    ProductAnalyticsService,
  ],
  exports: [AsteService, AsteAnalysisService, AstePipelineService],
})
export class AsteModule {}
