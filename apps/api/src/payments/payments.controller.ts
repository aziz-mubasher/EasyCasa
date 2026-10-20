import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
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
import { decidePaymentWebhook, truncateIp } from './webhook-route';

@Controller('payments')
@RequiresAuth()
export class PaymentsController {
  private readonly log = new Logger(PaymentsController.name);

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

  /**
   * Public. Signed Stripe when PAYMENTS_ENABLED.
   * Unsigned JSON only outside production and only with PAYMENTS_DEV_WEBHOOK=true.
   * Production never accepts an unsigned body (404), whatever the payments flag is.
   */
  @Public()
  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string | undefined,
  ) {
    const decision = decidePaymentWebhook({
      nodeEnv: apiConfig.NODE_ENV,
      paymentsEnabled: apiConfig.PAYMENTS_ENABLED,
      devWebhook: apiConfig.PAYMENTS_DEV_WEBHOOK,
      hasSignature: Boolean(sig),
    });

    if (decision.action === 'reject') {
      this.log.warn(
        `payments webhook rejected ip=${truncateIp(req.ip)} reason=${decision.reason}`,
      );
      throw new NotFoundException();
    }

    if (decision.action === 'stripe') {
      return this.stripeWebhook.handle(req.rawBody as Buffer, sig ?? '');
    }

    const dto = plainToInstance(WebhookDto, req.body);
    await validateOrReject(dto);
    await this.service.handleWebhook(dto);
    return { received: true };
  }
}
