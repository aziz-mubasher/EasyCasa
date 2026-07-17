import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ServiceCatalogService } from './service-catalog.service';
import { Public } from '../auth/public.decorator';

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
  constructor(private readonly service: ServiceCatalogService) {}

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
}
