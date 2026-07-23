import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { Public } from '../auth/public.decorator';
import { AreaSearchDto, BoundsSearchDto } from './dto';
import type { SearchFilters } from './domain/types';
import { LocationSuggestService } from './location-suggest.service';
import { MapSearchService } from './map-search.service';
import { SearchService } from './search.service';

class SearchQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsString() regionSlug?: string;
  @IsOptional() @IsString() provinceSlug?: string;
  @IsOptional() @IsIn(['sale', 'rent']) transactionType?: 'sale' | 'rent';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minBedrooms?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minBathrooms?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minSizeSqm?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxSizeSqm?: number;
  @IsOptional() @IsString() energyClass?: string;
  @IsOptional()
  @IsIn(['price:asc', 'price:desc', 'publishedAt:desc'])
  sort?: 'price:asc' | 'price:desc' | 'publishedAt:desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}

@Controller('search')
export class SearchController {
  constructor(
    private readonly search: SearchService,
    private readonly mapSearch: MapSearchService,
    private readonly locationSuggest: LocationSuggestService,
  ) {}

  /** Text / facet search (Phase 7). */
  @Public()
  @Get()
  run(@Query() q: SearchQueryDto) {
    return this.search.search(q);
  }

  /** Location typeahead for comune / provincia / regione hierarchy. */
  @Public()
  @Get('locations')
  suggest(@Query('q') q?: string) {
    return this.locationSuggest.suggest(q ?? '');
  }

  /** Viewport (bounding-box) search — the default map query. */
  @Public()
  @Post('bounds')
  bounds(@Body() dto: BoundsSearchDto) {
    return this.mapSearch.search({
      bbox: {
        minLat: dto.minLat,
        minLng: dto.minLng,
        maxLat: dto.maxLat,
        maxLng: dto.maxLng,
      },
      filters: (dto.filters ?? {}) as SearchFilters,
      zoom: dto.zoom,
    });
  }

  /** Draw-to-search — results inside the user-drawn polygon. */
  @Public()
  @Post('area')
  area(@Body() dto: AreaSearchDto) {
    const polygon = dto.polygon.map((p) => ({ lat: p.lat, lng: p.lng }));
    return this.mapSearch.search({
      bbox: { minLat: -90, minLng: -180, maxLat: 90, maxLng: 180 },
      polygon,
      filters: (dto.filters ?? {}) as SearchFilters,
      zoom: dto.zoom,
    });
  }
}
