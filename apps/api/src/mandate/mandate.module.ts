import { Module } from '@nestjs/common';

import { OrdersModule } from '../orders/orders.module';
import { MandateController } from './mandate.controller';
import {
  MandateService,
  MANDATE_REPOSITORY,
  SIGNATURE_PROVIDER,
} from './mandate.service';
import { DrizzleMandateRepository } from './drizzle-mandate.repository';
import { HttpSignatureProvider } from './signature.provider';

@Module({
  imports: [OrdersModule],
  controllers: [MandateController],
  providers: [
    MandateService,
    { provide: MANDATE_REPOSITORY, useClass: DrizzleMandateRepository },
    { provide: SIGNATURE_PROVIDER, useClass: HttpSignatureProvider },
  ],
  exports: [MandateService],
})
export class MandateModule {}
