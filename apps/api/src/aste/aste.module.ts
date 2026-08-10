import { Module } from '@nestjs/common';

import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import { AsteController } from './aste.controller';
import { AsteService } from './aste.service';

@Module({
  controllers: [AsteController],
  providers: [AsteService, ProductAnalyticsService],
  exports: [AsteService],
})
export class AsteModule {}
