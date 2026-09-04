import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../auth/public.decorator';
import { CallRequestsService } from './call-requests.service';
import { CreateCallRequestDto } from './dto/create-call-request.dto';

@Controller('call-requests')
export class CallRequestsController {
  constructor(private readonly service: CallRequestsService) {}

  /** Public callback request from /{locale}/prenota-chiamata. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  create(@Body() dto: CreateCallRequestDto) {
    return this.service.create(dto);
  }
}
