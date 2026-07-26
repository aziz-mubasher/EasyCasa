import { Module } from '@nestjs/common';

import { InvoicingModule } from '../invoicing/invoicing.module';
import { OrdersModule } from '../orders/orders.module';
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
import { StripePaymentProvider } from './stripe-payment.provider';
import { StripePaymentsWebhookHandler } from './stripe-webhook.handler';
import { apiConfig } from '../config';

function orderPaymentProvider(stripe: StripePaymentProvider, psp: PspPaymentProvider) {
  if (apiConfig.PAYMENTS_ENABLED && apiConfig.STRIPE_SECRET_KEY) return stripe;
  return psp;
}

@Module({
  imports: [InvoicingModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PspPaymentProvider,
    StripePaymentProvider,
    StripePaymentsWebhookHandler,
    { provide: PAYMENT_REPOSITORY, useClass: DrizzlePaymentRepository },
    {
      provide: PAYMENT_PROVIDER,
      useFactory: orderPaymentProvider,
      inject: [StripePaymentProvider, PspPaymentProvider],
    },
    { provide: PAYMENT_SUCCEEDED_HANDLER, useExisting: InvoiceOnPaymentSucceeded },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
