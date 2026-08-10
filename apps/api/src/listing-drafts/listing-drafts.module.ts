import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { ListingDraftsController } from './listing-drafts.controller';
import { ListingDraftsService } from './listing-drafts.service';

@Module({
  imports: [UsersModule],
  controllers: [ListingDraftsController],
  providers: [ListingDraftsService],
  exports: [ListingDraftsService],
})
export class ListingDraftsModule {}
