import { Controller, Get, Param, Post } from '@nestjs/common';

import { InvoicingService } from './invoicing.service';

@Controller('invoices')
export class InvoicingController {
  constructor(private readonly service: InvoicingService) {}

  /** Checkout preview — build-only; does not issue or transmit. */
  @Get('orders/:orderId/preview')
  preview(@Param('orderId') orderId: string) {
    return this.service.previewForOrder(orderId);
  }

  @Post('orders/:orderId')
  issue(@Param('orderId') orderId: string) {
    return this.service.issueForOrder(orderId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }
}
