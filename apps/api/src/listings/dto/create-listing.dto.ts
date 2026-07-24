import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  ASSET_CLASS_SLUGS,
  CONDITION_SLUGS,
  FINANCING_OPTION_SLUGS,
  LEASE_TYPE_SLUGS,
  PROPERTY_TYPE_SLUGS,
  SELLER_TYPE_SLUGS,
  TRANSACTION_TYPE_SLUGS,
} from '@easycasa/shared';

export class CreateListingDto {
  @IsString() @MinLength(3)
  title!: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsString()
  regionId?: string;

  @IsOptional() @IsIn([...TRANSACTION_TYPE_SLUGS])
  transactionType?: (typeof TRANSACTION_TYPE_SLUGS)[number];

  @IsOptional() @IsIn([...ASSET_CLASS_SLUGS])
  assetClass?: (typeof ASSET_CLASS_SLUGS)[number];

  @IsOptional() @IsIn([...PROPERTY_TYPE_SLUGS])
  propertyType?: (typeof PROPERTY_TYPE_SLUGS)[number];

  @IsOptional() @IsIn([...CONDITION_SLUGS])
  condition?: (typeof CONDITION_SLUGS)[number];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn([...FINANCING_OPTION_SLUGS], { each: true })
  financingOptions?: Array<(typeof FINANCING_OPTION_SLUGS)[number]>;

  @ValidateIf((o: CreateListingDto) => o.transactionType === 'rent')
  @IsOptional()
  @IsIn([...LEASE_TYPE_SLUGS])
  leaseType?: (typeof LEASE_TYPE_SLUGS)[number];

  @IsOptional() @IsIn([...SELLER_TYPE_SLUGS])
  sellerType?: (typeof SELLER_TYPE_SLUGS)[number];

  @IsOptional() @IsNumber() @Min(0)
  price?: number;

  @IsOptional() @IsInt() @Min(0) @Max(100)
  bedrooms?: number;

  @IsOptional() @IsInt() @Min(0) @Max(100)
  bathrooms?: number;

  @IsOptional() @IsNumber() @Min(0)
  sizeSqm?: number;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString()
  city?: string;

  @IsOptional() @IsString()
  province?: string;

  @IsOptional() @IsString()
  energyClass?: string;

  /** External video URL (YouTube, Vimeo, direct mp4, etc.). Stored as media type=video. */
  @IsOptional() @IsUrl({ require_tld: false })
  videoUrl?: string;

  @IsOptional() @IsNumber()
  latitude?: number;

  @IsOptional() @IsNumber()
  longitude?: number;

  @IsOptional() @IsArray() @IsString({ each: true })
  features?: string[];
}
