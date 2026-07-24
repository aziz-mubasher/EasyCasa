import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../users/users.module';
import { DbModule } from '../db/db.module';
import { ShareLinksController } from './share-links.controller';
import { ShareLinksRepository } from './share-links.repository';
import { ShareLinksService } from './share-links.service';

@Module({
  imports: [DbModule, UsersModule, ListingsModule],
  controllers: [ShareLinksController],
  providers: [ShareLinksRepository, ShareLinksService],
  exports: [ShareLinksService],
})
export class ShareLinksModule {}
