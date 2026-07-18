import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { Public } from '../auth/public.decorator';
import { CreateIntentDto, WebhookDto } from './dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('intents')
  createIntent(@Body() dto: CreateIntentDto) {
    return this.service.createIntent(dto);
  }

  @Get('intents/:id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post('intents/:id/refund')
  refund(@Param('id') id: string) {
    return this.service.refund(id);
  }

  /** Public — provider signature must be verified in the PSP adapter. */
  @Public()
  @Post('webhook')
  webhook(@Body() dto: WebhookDto) {
    return this.service.handleWebhook(dto);
  }
}
