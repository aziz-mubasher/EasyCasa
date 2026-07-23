import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { Public } from '../auth/public.decorator';
import { AreaSearchDto, BoundsSearchDto } from './dto';
import type { SearchFilters } from './domain/types';
import { LocationSuggestService } from './location-suggest.service';
import { MapSearchService } from './map-search.service';
import { SearchQueryDto } from './search-query.dto';
import { SearchService } from './search.service';

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
