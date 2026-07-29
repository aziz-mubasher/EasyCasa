import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

import { Public } from '../auth/public.decorator';
import { RequiresAuth } from '../auth/capability.decorator';
import { apiConfig } from '../config';
import { CreateIntentDto, WebhookDto } from './dto';
import { PaymentsService } from './payments.service';
import { StripePaymentsWebhookHandler } from './stripe-webhook.handler';

@Controller('payments')
@RequiresAuth()
export class PaymentsController {
  constructor(
    private readonly service: PaymentsService,
    private readonly stripeWebhook: StripePaymentsWebhookHandler,
  ) {}

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

  /** Public — Stripe signature verified when PAYMENTS_ENABLED; DEV JSON webhook otherwise. */
  @Public()
  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string | undefined,
  ) {
    if (apiConfig.PAYMENTS_ENABLED) {
      return this.stripeWebhook.handle(req.rawBody as Buffer, sig ?? '');
    }
    const dto = plainToInstance(WebhookDto, req.body);
    await validateOrReject(dto);
    await this.service.handleWebhook(dto);
    return { received: true };
  }
}
