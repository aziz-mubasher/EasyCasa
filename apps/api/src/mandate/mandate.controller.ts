import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { apiConfig } from '../config';
import { MandateService } from './mandate.service';
import { CreateMandateDto, RequestSignatureDto, SignatureWebhookDto } from './dto';
import { verifySignatureWebhook } from './signature.provider';

@Controller()
export class MandateController {
  constructor(private readonly service: MandateService) {}

  @Post('mandates')
  create(@Body() dto: CreateMandateDto) {
    return this.service.create(dto.orderId, {
      exclusive: dto.exclusive,
      durationMonths: dto.durationMonths,
    });
  }

  @Get('mandates/:id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  /** Returns a signingUrl; the owner signs in the provider's hosted flow. */
  @Post('mandates/:id/signature-request')
  requestSignature(@Param('id') id: string, @Body() dto: RequestSignatureDto) {
    return this.service.requestSignature(id, {
      email: dto.signerEmail,
      documentUrl: dto.documentUrl,
    });
  }

  /**
   * Signature provider webhook. Requires `x-signature` = HMAC-SHA256(hex) of
   * the raw body with SIGNATURE_WEBHOOK_SECRET when that secret is set.
   */
  @Post('webhooks/signature')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string | undefined,
    @Body() dto: SignatureWebhookDto,
  ) {
    const secret = apiConfig.SIGNATURE_WEBHOOK_SECRET;
    if (secret) {
      const raw = req.rawBody;
      if (!raw || !verifySignatureWebhook(raw, signature, secret)) {
        throw new UnauthorizedException('invalid webhook signature');
      }
    } else if (!apiConfig.DEV_AUTH) {
      throw new UnauthorizedException('SIGNATURE_WEBHOOK_SECRET is not configured');
    }

    await this.service.onSignatureCompleted(dto.envelopeId, dto.signedAt);
    return { ok: true };
  }
}
