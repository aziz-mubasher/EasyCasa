import { ITALIAN_PROVINCES, REGION_NAMES } from '@easycasa/shared';
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

export const CATEGORY_SLUGS = [
  'residential',
  'renovatable',
  'new-build',
  'commercial',
  'auction',
  'rooms',
] as const;

export const ENERGY_CLASSES = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

export const TRANSACTION_TYPES = ['sale', 'rent'] as const;

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
  @Matches(/^[^\x00-\x1f]*$/)
  city?: string;

  @IsOptional()
  @IsIn(CATEGORY_SLUGS)
  categorySlug?: (typeof CATEGORY_SLUGS)[number];

  @IsOptional()
  @IsIn(REGION_SLUGS)
  regionSlug?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(PROVINCE_SLUGS)
  provinceSlug?: string;

  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  transactionType?: (typeof TRANSACTION_TYPES)[number];

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
