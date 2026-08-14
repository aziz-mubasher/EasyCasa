import {
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { eq } from 'drizzle-orm';

import { Roles } from '../auth/roles.decorator';
import { RequiresAuth } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { StripeService } from '../billing/stripe.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { plans } from '../db/schema';
import { UsersService } from '../users/users.service';
import { PartnerDirectoryEnabledGuard } from './partner-directory.guard';
import { PartnerDirectoryService } from './partner-directory.service';

const PARTNER_DIRECTORY_PLAN_KEY = 'partner_directory_placement';

class ApplyDto {
  @IsString()
  @MinLength(1)
  category!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  province!: string;

  @IsOptional()
  @IsString()
  credentials?: string;

  @IsString()
  @MinLength(1)
  contact!: string;
}

/** PP-1 — authenticated partner self-serve apply + checkout. */
@Controller('partners/directory')
@RequiresAuth()
@Roles('partner', 'pro_marketer', 'admin')
@UseGuards(PartnerDirectoryEnabledGuard)
export class PartnerDirectoryPartnerController {
  constructor(
    private readonly directory: PartnerDirectoryService,
    private readonly stripe: StripeService,
    private readonly users: UsersService,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    const entry = await this.directory.findByUserId(me.id);
    const checkoutAvailable = await this.isCheckoutAvailable();
    return { entry, checkoutAvailable };
  }

  @Post('apply')
  async apply(@CurrentUser() user: AuthUser, @Body() body: ApplyDto) {
    const me = await this.users.getOrCreate(user);
    return this.directory.apply(me.id, body);
  }

  @Post('checkout')
  async checkout(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    const entry = await this.directory.findByUserId(me.id);
    if (!entry) throw new NotFoundException('partner listing not found');
    if (!entry.active) throw new ConflictException('listing is inactive');
    if (entry.paidPlacement) throw new ConflictException('listing already has paid placement');
    const url = await this.stripe.createPartnerDirectoryCheckout(entry.id, me.id);
    return { url };
  }

  private async isCheckoutAvailable(): Promise<boolean> {
    const planRows = await this.db
      .select({ stripePriceId: plans.stripePriceId })
      .from(plans)
      .where(eq(plans.key, PARTNER_DIRECTORY_PLAN_KEY))
      .limit(1);
    return Boolean(planRows[0]?.stripePriceId?.trim());
  }
}
