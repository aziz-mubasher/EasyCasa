import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { PropertiesModule } from '../properties/properties.module';
import { OrdersController } from './orders.controller';
import { OrdersService, ORDER_REPOSITORY, PRICING_PORT } from './orders.service';
import { DrizzleOrderRepository } from './drizzle-order.repository';
import { Phase8PricingAdapter } from './phase8-pricing.adapter';

@Module({
  imports: [UsersModule, PropertiesModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    Phase8PricingAdapter,
    { provide: ORDER_REPOSITORY, useClass: DrizzleOrderRepository },
    { provide: PRICING_PORT, useExisting: Phase8PricingAdapter },
  ],
  exports: [OrdersService, PRICING_PORT, Phase8PricingAdapter, ORDER_REPOSITORY],
})
export class OrdersModule {}
