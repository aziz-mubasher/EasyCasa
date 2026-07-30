import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Logger,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { Public } from '../auth/public.decorator';
import { WhatsAppService } from './whatsapp.service';

/**
 * Meta Cloud API webhook — subscription verify (GET) + statuses/messages (POST).
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
@Controller('whatsapp')
export class WhatsAppWebhookController {
  private readonly log = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly whatsapp: WhatsAppService,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  @Public()
  @Get('webhook')
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    const expected = this.config.WHATSAPP_VERIFY_TOKEN;
    if (mode === 'subscribe' && expected && token === expected && challenge) {
      this.log.log('whatsapp webhook verified');
      return challenge;
    }
    throw new ForbiddenException('webhook verification failed');
  }

  @Public()
  @Post('webhook')
  receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature?: string,
  ): { received: true } {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      throw new BadRequestException('raw body required');
    }
    // When APP_SECRET is unset (local), accept but do not treat as production-safe.
    if (this.config.WHATSAPP_APP_SECRET) {
      if (!this.whatsapp.verifyWebhookSignature(raw, signature)) {
        throw new ForbiddenException('invalid webhook signature');
      }
    } else {
      this.log.warn('WHATSAPP_APP_SECRET unset — skipping signature check');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      throw new BadRequestException('invalid json');
    }
    this.whatsapp.ingestStatusPayload(payload);
    return { received: true };
  }
}
