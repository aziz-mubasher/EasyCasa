import { Body, Controller, ForbiddenException, Get, Post } from '@nestjs/common';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ServiceCatalogService } from './service-catalog.service';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { apiConfig } from '../config';
import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';

class QuoteRequestDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  items?: string[];

  @IsOptional()
  @IsString()
  packageCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  referenceValueCents?: number;
}

class ConfirmQuoteDto extends QuoteRequestDto {
  @IsUUID()
  propertyId!: string;
}

@Controller('service-catalog')
export class ServiceCatalogController {
  constructor(
    private readonly service: ServiceCatalogService,
    private readonly orders: OrdersService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Get()
  items() {
    return this.service.listItems();
  }

  @Public()
  @Get('packages')
  packages() {
    return this.service.listPackages();
  }

  /** Build a transparent, itemised quote from à la carte items and/or a package. */
  @Public()
  @Post('quote')
  quote(@Body() dto: QuoteRequestDto) {
    return this.service.quote(dto);
  }

  /** Accept a quote → persist ServiceOrder + lines (ledger matches quote cents). */
  @Post('orders')
  confirm(@Body() dto: ConfirmQuoteDto) {
    return this.service.confirmQuote(dto.propertyId, dto);
  }

  /**
   * Public pricing checkout — fixed-fee catalog order for the signed-in user.
   * Requires PAYMENTS_ENABLED (test mode); provvigione/passthrough stay quote-only.
   */
  @Post('checkout-orders')
  async checkoutOrder(@CurrentUser() user: AuthUser, @Body() dto: QuoteRequestDto) {
    if (!apiConfig.PAYMENTS_ENABLED) {
      throw new ForbiddenException('Payments are disabled');
    }
    const me = await this.users.getOrCreate(user);
    return this.orders.createCatalogOrder(me.id, dto);
  }
}
