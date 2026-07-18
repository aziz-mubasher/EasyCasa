import { Controller, Get, Param, Post } from '@nestjs/common';

import { InvoicingService } from './invoicing.service';

@Controller('invoices')
export class InvoicingController {
  constructor(private readonly service: InvoicingService) {}

  @Post('orders/:orderId')
  issue(@Param('orderId') orderId: string) {
    return this.service.issueForOrder(orderId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }
}
