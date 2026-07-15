import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import type { TransactionType } from '@easycasa/shared';

export class QueryListingDto {
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsString() regionSlug?: string;
  @IsOptional() @IsIn(['sale', 'rent']) transactionType?: TransactionType;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minBedrooms?: number;

  // geo bounds (map "search this area")
  @IsOptional() @Type(() => Number) @IsNumber() minLat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() minLng?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxLat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxLng?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize: number = 24;
}
