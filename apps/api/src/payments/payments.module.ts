import { Module } from '@nestjs/common';

import { InvoicingModule } from '../invoicing/invoicing.module';
import { InvoiceOnPaymentSucceeded } from '../invoicing/invoicing.service';
import { DrizzlePaymentRepository } from './drizzle-payment.repository';
import { PaymentsController } from './payments.controller';
import {
  PAYMENT_PROVIDER,
  PAYMENT_REPOSITORY,
  PAYMENT_SUCCEEDED_HANDLER,
  PaymentsService,
} from './payments.service';
import { PspPaymentProvider } from './psp-payment.provider';

@Module({
  imports: [InvoicingModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PspPaymentProvider,
    { provide: PAYMENT_REPOSITORY, useClass: DrizzlePaymentRepository },
    { provide: PAYMENT_PROVIDER, useExisting: PspPaymentProvider },
    { provide: PAYMENT_SUCCEEDED_HANDLER, useExisting: InvoiceOnPaymentSucceeded },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
