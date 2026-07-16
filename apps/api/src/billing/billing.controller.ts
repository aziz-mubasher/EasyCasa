import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { StripeService } from './stripe.service';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';

class CheckoutDto { @IsString() planKey!: string; }

@Controller('billing')
export class BillingController {
  constructor(
    private readonly stripe: StripeService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Get('plans')
  plans() { return this.stripe.listPlans(); }

  @Post('checkout')
  async checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    const me = await this.users.getOrCreate(user);
    return { url: await this.stripe.createSubscriptionCheckout(me.id, user.email, dto.planKey) };
  }

  @Post('portal')
  async portal(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return { url: await this.stripe.createPortalSession(me.id) };
  }
}
