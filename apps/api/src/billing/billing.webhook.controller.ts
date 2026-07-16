import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from './stripe.service';
import { Public } from '../auth/public.decorator';

@Controller('billing')
export class BillingWebhookController {
  constructor(private readonly stripe: StripeService) {}

  @Public()
  @Post('webhook')
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string) {
    await this.stripe.handleWebhook(req.rawBody as Buffer, sig);
    return { received: true };
  }
}
