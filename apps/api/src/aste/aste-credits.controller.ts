import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { Throttle } from '@nestjs/throttler';

import { RequiresAuth } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { StripeService } from '../billing/stripe.service';
import { UsersService } from '../users/users.service';
import { AsteAnalysisEnabledGuard } from './aste-analysis.guard';
import { AsteCreditsService } from './aste-credits.service';
import { AsteMonetisationEnabledGuard } from './aste-monetisation.guard';

class CreditCheckoutDto {
  @IsIn([1, 3, 10])
  pack!: 1 | 3 | 10;
}

@Controller('aste/credits')
@RequiresAuth()
@UseGuards(AsteAnalysisEnabledGuard, AsteMonetisationEnabledGuard)
export class AsteCreditsController {
  constructor(
    private readonly credits: AsteCreditsService,
    private readonly stripe: StripeService,
    private readonly users: UsersService,
  ) {}

  @Get('balance')
  async balance(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return { balance: await this.credits.getBalance(me.id) };
  }

  @Get('packs')
  packs() {
    return {
      packs: this.credits.listPacks().map((credits) => ({ credits })),
    };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('checkout')
  async checkout(@CurrentUser() user: AuthUser, @Body() dto: CreditCheckoutDto) {
    const me = await this.users.getOrCreate(user);
    const pack = this.credits.assertPack(dto.pack);
    const url = await this.stripe.createAsteCreditsCheckout(me.id, me.email ?? undefined, pack);
    return { url };
  }
}

@Controller('aste/analyses')
@RequiresAuth()
@UseGuards(AsteAnalysisEnabledGuard, AsteMonetisationEnabledGuard)
export class AsteUnlockController {
  constructor(
    private readonly credits: AsteCreditsService,
    private readonly users: UsersService,
  ) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(':id/unlock')
  async unlock(@CurrentUser() user: AuthUser, @Param('id') analysisId: string) {
    const me = await this.users.getOrCreate(user);
    return this.credits.unlockReport(me.id, analysisId);
  }
}
