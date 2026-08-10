import { Module } from '@nestjs/common';

import { MediaModule } from '../media/media.module';
import { UsersModule } from '../users/users.module';
import { VerifiedOwnerController } from './verified-owner.controller';
import { VerifiedOwnerDataSource } from './verified-owner.data-source';
import { VerifiedOwnerExpireScheduler } from './verified-owner.expire';
import { VerifiedOwnerEnabledGuard } from './verified-owner.guard';
import { VerifiedOwnerService } from './verified-owner.service';

@Module({
  imports: [UsersModule, MediaModule],
  controllers: [VerifiedOwnerController],
  providers: [
    VerifiedOwnerService,
    VerifiedOwnerEnabledGuard,
    VerifiedOwnerExpireScheduler,
    VerifiedOwnerDataSource,
  ],
  exports: [VerifiedOwnerService, VerifiedOwnerDataSource],
})
export class VerifiedOwnerModule {}
