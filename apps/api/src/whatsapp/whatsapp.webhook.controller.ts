import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
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
import { EcConsultWebhookService } from '../ec-consult/ec-consult-webhook.service';
import { WhatsAppHubService } from './whatsapp-hub.service';
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
    private readonly hub: WhatsAppHubService,
    private readonly ecConsultWebhook: EcConsultWebhookService,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  /** Health for ops probes — no secrets. */
  @Public()
  @Get('webhook/status')
  async status() {
    const connection = await this.hub.connectionStatus();
    return {
      ok: true,
      configured: connection.configured,
      graphVersion: connection.graphVersion,
      phoneNumberIdSet: connection.phoneNumberIdSet,
      appSecretSet: connection.appSecretSet,
      verifyTokenSet: connection.verifyTokenSet,
      lastInboundAt: connection.lastInboundAt,
      signatureRejectedTotal: connection.signatureRejectedTotal,
    };
  }

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
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<{ received: true }> {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      throw new BadRequestException('raw body required');
    }

    const sig6605 = this.ecConsultWebhook.verify6605Signature(raw, signature);
    const sigDefault = this.whatsapp.verifyWebhookSignature(raw, signature);
    if (!sig6605 && !sigDefault) {
      if (!this.config.WHATSAPP_APP_SECRET.trim() && !this.config.WHATSAPP_6605_APP_SECRET.trim()) {
        whatsappInboundSignatureRejected.inc();
        throw new ForbiddenException('webhook signature required');
      }
      whatsappInboundSignatureRejected.inc();
      throw new ForbiddenException('invalid webhook signature');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      throw new BadRequestException('invalid json');
    }

    if (sig6605 && this.ecConsultWebhook.payloadTargets6605(payload)) {
      void this.ecConsultWebhook.ingest(payload).catch((err) => {
        this.log.warn(`ec-consult ingest failed: ${String(err)}`);
      });
      return { received: true };
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
