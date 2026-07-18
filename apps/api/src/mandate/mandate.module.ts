import { Module, forwardRef } from '@nestjs/common';

import { AmlModule } from '../aml/aml.module';
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
  imports: [OrdersModule, forwardRef(() => AmlModule)],
  controllers: [MandateController],
  providers: [
    MandateService,
    { provide: MANDATE_REPOSITORY, useClass: DrizzleMandateRepository },
    { provide: SIGNATURE_PROVIDER, useClass: HttpSignatureProvider },
  ],
  exports: [MandateService],
})
export class MandateModule {}
