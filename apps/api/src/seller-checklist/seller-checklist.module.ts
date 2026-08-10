import { Module } from '@nestjs/common';

import { MediaModule } from '../media/media.module';
import { UsersModule } from '../users/users.module';
import {
  SellerChecklistController,
  SellerChecklistEnabledGuard,
} from './seller-checklist.controller';
import { SellerChecklistService } from './seller-checklist.service';

@Module({
  imports: [UsersModule, MediaModule],
  controllers: [SellerChecklistController],
  providers: [SellerChecklistService, SellerChecklistEnabledGuard],
  exports: [SellerChecklistService],
})
export class SellerChecklistModule {}
