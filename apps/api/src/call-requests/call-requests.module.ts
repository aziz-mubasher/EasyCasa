import { Module } from '@nestjs/common';

import { CallRequestsController } from './call-requests.controller';
import { CallRequestsService } from './call-requests.service';

@Module({
  controllers: [CallRequestsController],
  providers: [CallRequestsService],
  exports: [CallRequestsService],
})
export class CallRequestsModule {}
