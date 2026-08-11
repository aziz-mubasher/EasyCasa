import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { ListingsModule } from '../listings/listings.module';
import { SellerQuotaModule } from '../seller-quota/seller-quota.module';
import { SellerModule } from '../seller/seller.module';
import { ListingDraftsController } from './listing-drafts.controller';
import { ListingDraftsService } from './listing-drafts.service';

@Module({
  imports: [UsersModule, ListingsModule, SellerQuotaModule, SellerModule],
  controllers: [ListingDraftsController],
  providers: [ListingDraftsService],
  exports: [ListingDraftsService],
})
export class ListingDraftsModule {}
