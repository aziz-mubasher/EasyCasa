import { Module } from '@nestjs/common';

import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import { AsteAnalysesDataSource } from '../privacy/sources/aste-analyses.data-source';
import { UsersModule } from '../users/users.module';
import { AsteAnalysisController } from './aste-analysis.controller';
import { AsteAnalysisEnabledGuard } from './aste-analysis.guard';
import { AsteAnalysisService } from './aste-analysis.service';
import { AsteController } from './aste.controller';
import { AsteDocsRetentionScheduler } from './aste-docs-retention.scheduler';
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
    AsteAnalysisEnabledGuard,
    AsteDocsRetentionScheduler,
    AsteAnalysesDataSource,
    AstePrivacyBoot,
    ProductAnalyticsService,
  ],
  exports: [AsteService, AsteAnalysisService],
})
export class AsteModule {}
