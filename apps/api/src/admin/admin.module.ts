import { Module } from '@nestjs/common';

import { AssignmentsModule } from '../assignments/assignments.module';
import { OrdersModule } from '../orders/orders.module';
import { AdminController } from './admin.controller';

/** Privacy services come from global PrivacyModule.forRoot (Phase 39.1). */
@Module({
  imports: [OrdersModule, AssignmentsModule],
  controllers: [AdminController],
})
export class AdminModule {}
