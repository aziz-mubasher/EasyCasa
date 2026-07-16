import { Body, Controller, Post } from '@nestjs/common';
import { IsInt, IsString, Max, Min } from 'class-validator';
import { StripeService } from '../billing/stripe.service';
import { Roles } from '../auth/roles.decorator';

class FeatureDto {
  @IsString() listingId!: string;
  @IsInt() @Min(1) @Max(90) days!: number;
}

@Controller('featured')
@Roles('seller', 'agent', 'partner', 'pro_marketer')
export class FeaturedController {
  constructor(private readonly stripe: StripeService) {}

  @Post('checkout')
  async checkout(@Body() dto: FeatureDto) {
    return { url: await this.stripe.createFeaturedCheckout(dto.listingId, dto.days) };
  }
}
