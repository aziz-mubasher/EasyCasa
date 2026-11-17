import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { Public } from '../auth/public.decorator';
import { CallbacksService } from './callbacks.service';

/** ElevenLabs post-call transcription webhook. Audio events are ignored. */
@Controller('voice/callbacks')
export class CallbacksWebhookController {
  constructor(private readonly callbacks: CallbacksService) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('elevenlabs-signature') signature?: string,
  ) {
    const raw = req.rawBody;
    const body = raw && Buffer.isBuffer(raw) ? raw.toString('utf8') : '';
    return this.callbacks.ingest(body, signature);
  }
}
