import { Module } from '@nestjs/common';

import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../users/users.module';
import { ShareLinksController } from './share-links.controller';
import { ShareLinksRepository } from './share-links.repository';
import { ShareLinksService } from './share-links.service';

@Module({
  imports: [UsersModule, ListingsModule],
  controllers: [ShareLinksController],
  providers: [ShareLinksService, ShareLinksRepository],
  exports: [ShareLinksService],
})
export class ShareLinksModule {}
