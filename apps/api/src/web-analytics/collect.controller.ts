import { Controller, HttpCode, Post, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../auth/public.decorator';
import { CollectService, type CollectRequest } from './collect.service';

@Controller('collect')
@Public()
@SkipThrottle()
export class CollectController {
  constructor(private readonly collect: CollectService) {}

  @Post()
  @HttpCode(204)
  async ingest(@Req() req: Request): Promise<void> {
    const body = req as Request & { collectRaw?: string };
    const input: CollectRequest = {
      headers: req.headers as CollectRequest['headers'],
      socketIp: req.ip || req.socket?.remoteAddress,
      body: req.body,
      collectRaw: body.collectRaw,
    };
    try {
      await this.collect.ingest(input);
    } catch {
      // 204 either way. Do not log the request: it can carry an address.
    }
  }
}
