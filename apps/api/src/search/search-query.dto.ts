import {
  ASSET_CLASS_SLUGS,
  CONDITION_SLUGS,
  FEATURE_SLUGS,
  FINANCING_OPTION_SLUGS,
  ITALIAN_PROVINCES,
  LEASE_TYPE_SLUGS,
  LEGACY_CATEGORY_SLUGS,
  PROPERTY_TYPE_SLUGS,
  REGION_NAMES,
  SELLER_TYPE_SLUGS,
  TRANSACTION_TYPE_SLUGS,
} from '@easycasa/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

import { NoControlChars } from '../common/validators/no-control-chars.validator';

export const CATEGORY_SLUGS = LEGACY_CATEGORY_SLUGS;
export const ENERGY_CLASSES = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export const TRANSACTION_TYPES = TRANSACTION_TYPE_SLUGS;
export const SORT_OPTIONS = ['price:asc', 'price:desc', 'publishedAt:desc'] as const;
export const PROVINCE_SLUGS = ITALIAN_PROVINCES.map((p) => p.slug);
export const REGION_SLUGS = Object.keys(REGION_NAMES);

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @NoControlChars()
  city?: string;

  @IsOptional()
  @IsIn([...CATEGORY_SLUGS])
  categorySlug?: (typeof CATEGORY_SLUGS)[number];

  @IsOptional()
  @IsIn(REGION_SLUGS)
  regionSlug?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(PROVINCE_SLUGS)
  provinceSlug?: string;

  @IsOptional()
  @IsIn([...TRANSACTION_TYPES])
  transactionType?: (typeof TRANSACTION_TYPES)[number];

  @IsOptional()
  @IsIn([...ASSET_CLASS_SLUGS])
  assetClass?: (typeof ASSET_CLASS_SLUGS)[number];

  @IsOptional()
  @IsIn([...PROPERTY_TYPE_SLUGS])
  propertyType?: (typeof PROPERTY_TYPE_SLUGS)[number];

  @IsOptional()
  @IsIn([...CONDITION_SLUGS])
  condition?: (typeof CONDITION_SLUGS)[number];

  /** Single NIB mode filter (array contains in Meili). */
  @IsOptional()
  @IsIn([...FINANCING_OPTION_SLUGS])
  financingOption?: (typeof FINANCING_OPTION_SLUGS)[number];

  @IsOptional()
  @IsIn([...LEASE_TYPE_SLUGS])
  leaseType?: (typeof LEASE_TYPE_SLUGS)[number];

  @IsOptional()
  @IsIn([...SELLER_TYPE_SLUGS])
  sellerType?: (typeof SELLER_TYPE_SLUGS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minBedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minBathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minSizeSqm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxSizeSqm?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(ENERGY_CLASSES)
  energyClass?: (typeof ENERGY_CLASSES)[number];

  /** Comma-separated characteristic slugs (AND). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(new RegExp(`^(${FEATURE_SLUGS.join('|')})(,(${FEATURE_SLUGS.join('|')}))*$`))
  features?: string;

  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sort?: (typeof SORT_OPTIONS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
