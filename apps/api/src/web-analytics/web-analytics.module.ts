import { MiddlewareConsumer, Module, NestModule, OnModuleInit, RequestMethod } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { collectBodyMiddleware } from './collect.middleware';
import { CollectController } from './collect.controller';
import { CollectService } from './collect.service';
import { RollupScheduler } from './rollup.scheduler';
import { RollupService } from './rollup.service';
import { registerServerConversionSink } from './server-conversion';
import { ServerConversionService } from './server-conversion.service';

@Module({
  imports: [UsersModule],
  controllers: [CollectController, AdminAnalyticsController],
  providers: [
    CollectService,
    RollupService,
    RollupScheduler,
    ServerConversionService,
    AdminAnalyticsService,
  ],
})
export class WebAnalyticsModule implements NestModule, OnModuleInit {
  constructor(private readonly conversions: ServerConversionService) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(collectBodyMiddleware).forRoutes({ path: 'collect', method: RequestMethod.POST });
  }

  onModuleInit(): void {
    registerServerConversionSink((name) => {
      void this.conversions.bump(name).catch(() => undefined);
    });
  }
}
