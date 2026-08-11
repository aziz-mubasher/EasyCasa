import { Module } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { SearchModule } from '../search/search.module';
import { ListingBoostExpireWorker } from './listing-boost-expire.worker';
import { ListingBoostService } from './listing-boost.service';

@Module({
  imports: [DbModule, SearchModule],
  providers: [ListingBoostService, ListingBoostExpireWorker],
  exports: [ListingBoostService],
})
export class ListingBoostModule {}
