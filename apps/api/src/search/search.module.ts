import { Module } from '@nestjs/common';

import { SEARCH_INDEX } from './domain/ports';
import { MapSearchService } from './map-search.service';
import { MeiliSearchIndex } from './meili-search.index';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  providers: [
    SearchService,
    MapSearchService,
    MeiliSearchIndex,
    { provide: SEARCH_INDEX, useExisting: MeiliSearchIndex },
  ],
  exports: [SearchService, MapSearchService, SEARCH_INDEX],
})
export class SearchModule {}
