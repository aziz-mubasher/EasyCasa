import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../auth/public.decorator';
import { AsteService } from './aste.service';
import { CreateAsteLeadDto } from './dto/create-aste-lead.dto';

@Controller('aste')
export class AsteController {
  constructor(private readonly service: AsteService) {}

  /** Public lead magnet signup — guide link + early-access waitlist. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('leads')
  createLead(@Body() dto: CreateAsteLeadDto) {
    return this.service.createLead(dto);
  }

  /** Validate unguessable guide token; used by `/[locale]/aste/guida`. */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('guide/:token')
  resolveGuide(@Param('token') token: string) {
    return this.service.resolveGuideToken(token);
  }
}
