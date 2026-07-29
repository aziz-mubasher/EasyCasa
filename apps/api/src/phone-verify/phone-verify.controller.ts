import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, MinLength } from 'class-validator';
import type { Request } from 'express';

import { RequiresAuth } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { PhoneVerifyService } from './phone-verify.service';

class StartDto {
  @IsString()
  @MinLength(8)
  phone!: string;
}

class ConfirmDto {
  @IsString()
  @MinLength(4)
  code!: string;
}

@Controller('me/phone')
@RequiresAuth()
export class PhoneVerifyController {
  constructor(
    private readonly service: PhoneVerifyService,
    private readonly users: UsersService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify/start')
  async start(@CurrentUser() user: AuthUser, @Body() dto: StartDto, @Req() req: Request) {
    const me = await this.users.getOrCreate(user);
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : null) ?? req.ip ?? null;
    return this.service.start(me.id, dto.phone, { email: me.email, ip });
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('verify/confirm')
  async confirm(@CurrentUser() user: AuthUser, @Body() dto: ConfirmDto) {
    const me = await this.users.getOrCreate(user);
    return this.service.confirm(me.id, dto.code);
  }
}
