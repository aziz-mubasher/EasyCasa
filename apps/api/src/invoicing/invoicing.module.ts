import { Module } from '@nestjs/common';

import { OrdersModule } from '../orders/orders.module';
import { DrizzleInvoiceRepository } from './drizzle-invoice.repository';
import { InvoicingController } from './invoicing.controller';
import {
  INVOICE_REPOSITORY,
  InvoiceOnPaymentSucceeded,
  InvoicingService,
  SDI_CHANNEL,
} from './invoicing.service';
import { INVOICE_SOURCE, OrderInvoiceSource } from './order-invoice.source';
import { SdIChannelProvider } from './sdi-channel.provider';

@Module({
  imports: [OrdersModule],
  controllers: [InvoicingController],
  providers: [
    InvoicingService,
    InvoiceOnPaymentSucceeded,
    OrderInvoiceSource,
    SdIChannelProvider,
    { provide: INVOICE_REPOSITORY, useClass: DrizzleInvoiceRepository },
    { provide: SDI_CHANNEL, useExisting: SdIChannelProvider },
    { provide: INVOICE_SOURCE, useExisting: OrderInvoiceSource },
  ],
  exports: [InvoicingService, InvoiceOnPaymentSucceeded],
})
export class InvoicingModule {}
