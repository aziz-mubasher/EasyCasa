import {
  IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength,
} from 'class-validator';
import type { TransactionType } from '@easycasa/shared';

export class CreateListingDto {
  @IsString() @MinLength(3)
  title!: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsString()
  regionId?: string;

  @IsOptional() @IsIn(['sale', 'rent'])
  transactionType?: TransactionType;

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

  @IsOptional() @IsNumber()
  latitude?: number;

  @IsOptional() @IsNumber()
  longitude?: number;

  @IsOptional() @IsArray() @IsString({ each: true })
  features?: string[];
}
