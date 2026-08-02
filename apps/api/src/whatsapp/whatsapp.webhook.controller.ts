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
import { whatsappInboundSignatureRejected } from '../observability/metrics';
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
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<{ received: true }> {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      throw new BadRequestException('raw body required');
    }

    // EC-17: fail closed — empty APP_SECRET rejects (same posture as forged HMAC).
    if (!this.config.WHATSAPP_APP_SECRET.trim()) {
      whatsappInboundSignatureRejected.inc();
      throw new ForbiddenException('webhook signature required');
    }
    if (!this.whatsapp.verifyWebhookSignature(raw, signature)) {
      whatsappInboundSignatureRejected.inc();
      throw new ForbiddenException('invalid webhook signature');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      throw new BadRequestException('invalid json');
    }

    // EC-16 status rows + EC-17 inbound persist; after-persist is fire-and-forget.
    const newIds = await this.whatsapp.ingestWebhookPayload(payload);
    if (newIds.length) {
      void this.whatsapp.handleInboundAfterPersist(newIds).catch((err) => {
        this.log.warn(`inbound after-persist failed: ${String(err)}`);
      });
    }
    return { received: true };
  }
}
