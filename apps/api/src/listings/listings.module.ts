import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ListingsRepository } from './listings.repository';
import { DrizzleListingReadRepository } from './drizzle-listing-read.repository';
import { LISTING_READ } from './domain/ports';
import { UsersModule } from '../users/users.module';
import { SearchModule } from '../search/search.module';
import { DbModule } from '../db/db.module';
import { AlertsModule } from '../alerts/alerts.module';
import { AvmModule } from '../avm/avm.module';

@Module({
  imports: [UsersModule, SearchModule, DbModule, AlertsModule, AvmModule],
  controllers: [ListingsController],
  providers: [
    ListingsService,
    ListingsRepository,
    DrizzleListingReadRepository,
    { provide: LISTING_READ, useExisting: DrizzleListingReadRepository },
  ],
  exports: [ListingsService],
})
export class ListingsModule {}
