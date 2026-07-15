import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SearchService } from './search.service';
import { Public } from '../auth/public.decorator';

class SearchQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsString() regionSlug?: string;
  @IsOptional() @IsIn(['sale', 'rent']) transactionType?: 'sale' | 'rent';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minBedrooms?: number;
  @IsOptional() @IsIn(['price:asc', 'price:desc', 'publishedAt:desc']) sort?:
    'price:asc' | 'price:desc' | 'publishedAt:desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Public()
  @Get()
  run(@Query() q: SearchQueryDto) {
    return this.search.search(q);
  }
}
