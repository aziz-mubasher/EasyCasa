import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DbModule } from '../db/db.module';
import { UsersModule } from '../users/users.module';
import { AdminPartnerDirectoryController } from './admin-partner-directory.controller';
import { PartnerDirectoryController } from './partner-directory.controller';
import { PartnerDirectoryEnabledGuard } from './partner-directory.guard';
import { PartnerDirectoryService } from './partner-directory.service';

@Module({
  imports: [DbModule, UsersModule, AuthorityModule],
  controllers: [PartnerDirectoryController, AdminPartnerDirectoryController],
  providers: [PartnerDirectoryService, PartnerDirectoryEnabledGuard],
  exports: [PartnerDirectoryService],
})
export class PartnerDirectoryModule {}
