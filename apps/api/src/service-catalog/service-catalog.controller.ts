import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ServiceCatalogService } from './service-catalog.service';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { apiConfig } from '../config';
import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';
import { CoverageAvailabilityService } from '../professionals/coverage-availability.service';
import { CATALOG } from './domain/catalog';
import { resolveOrderItemCodes } from '../transactions/domain/legal-basis';
import { PACKAGES } from './domain/catalog';

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

  /** Province sigla (e.g. BS) — required for coverage-gated items. */
  @IsOptional()
  @IsString()
  province?: string;
}

class ConfirmQuoteDto extends QuoteRequestDto {
  @IsUUID()
  propertyId!: string;
}

class DemandLogDto {
  @IsString()
  itemCode!: string;

  @IsString()
  province!: string;
}

const PACKAGE_CONTENTS: Record<string, readonly string[]> = Object.fromEntries(
  PACKAGES.map((p) => [p.code, p.includes]),
);

@Controller('service-catalog')
export class ServiceCatalogController {
  constructor(
    private readonly service: ServiceCatalogService,
    private readonly orders: OrdersService,
    private readonly users: UsersService,
    private readonly coverage: CoverageAvailabilityService,
  ) {}

  @Public()
  @Get()
  async items(@Query('province') province?: string) {
    const items = this.service.listItems();
    if (!province?.trim()) return items;
    const availability = await this.coverage.availabilityForItems(
      items.map((i) => i.code),
      province,
    );
    const byCode = new Map(availability.map((a) => [a.itemCode, a]));
    return items.map((item) => {
      const avail = byCode.get(item.code);
      return {
        ...item,
        available: avail?.available ?? true,
        capacityConstrained: avail?.capacityConstrained ?? false,
        requiredCredential: avail?.requiredCredential,
        availabilityReason: avail?.reason,
        availabilityReasonEn: avail?.reasonEn,
        availabilityReasonIt: avail?.reasonIt,
        // Never expose price for unavailable items (bait-price rule).
        ...(avail && !avail.available
          ? { amountCents: null, ratePercent: null }
          : {}),
      };
    });
  }

  @Public()
  @Get('packages')
  packages() {
    return this.service.listPackages();
  }

  /** Build a transparent, itemised quote from à la carte items and/or a package. */
  @Public()
  @Post('quote')
  async quote(@Body() dto: QuoteRequestDto) {
    const itemCodes = resolveOrderItemCodes(dto, PACKAGE_CONTENTS);
    await this.coverage.assertOrderable(itemCodes, dto.province);
    const quote = this.service.quote(dto);
    const availability = dto.province
      ? await this.coverage.availabilityForItems(itemCodes, dto.province)
      : [];
    return {
      ...quote,
      province: dto.province ?? null,
      availability,
    };
  }

  /** Accept a quote → persist ServiceOrder + lines (ledger matches quote cents). */
  @Post('orders')
  async confirm(@Body() dto: ConfirmQuoteDto) {
    const itemCodes = resolveOrderItemCodes(dto, PACKAGE_CONTENTS);
    const propertyProvince = await this.service.propertyProvince(dto.propertyId);
    await this.coverage.assertOrderable(itemCodes, dto.province ?? propertyProvince);
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
    const itemCodes = resolveOrderItemCodes(dto, PACKAGE_CONTENTS);
    await this.coverage.assertOrderable(itemCodes, dto.province);
    const me = await this.users.getOrCreate(user);
    return this.orders.createCatalogOrder(me.id, dto);
  }

  /**
   * Demand signal — user opened / notified on an unavailable item (EC-10).
   * Auth optional; user_id recorded when signed in.
   */
  @Public()
  @Post('demand')
  async demand(@Body() dto: DemandLogDto, @CurrentUser() user?: AuthUser) {
    let userId: string | null = null;
    if (user) {
      try {
        const me = await this.users.getOrCreate(user);
        userId = me.id;
      } catch {
        userId = null;
      }
    }
    return this.coverage.logDemand({
      itemCode: dto.itemCode,
      province: dto.province,
      userId,
    });
  }

  /** Sanity: known catalog codes (used by admin matrix seeds). */
  @Public()
  @Get('codes')
  codes() {
    return CATALOG.map((c) => c.code);
  }
}
