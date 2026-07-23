import { Module } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { SEARCH_INDEX } from './domain/ports';
import { LocationSuggestService } from './location-suggest.service';
import { MapSearchService } from './map-search.service';
import { MeiliSearchIndex } from './meili-search.index';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [DbModule],
  controllers: [SearchController],
  providers: [
    SearchService,
    MapSearchService,
    LocationSuggestService,
    MeiliSearchIndex,
    { provide: SEARCH_INDEX, useExisting: MeiliSearchIndex },
  ],
  exports: [SearchService, MapSearchService, SEARCH_INDEX],
})
export class SearchModule {}
