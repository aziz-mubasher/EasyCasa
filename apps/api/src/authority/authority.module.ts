import { Global, Module } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { AdminAuditService } from './admin-audit.service';
import { AuthorityAuditService } from './authority-audit.service';

@Global()
@Module({
  imports: [DbModule],
  providers: [AuthorityAuditService, AdminAuditService],
  exports: [AuthorityAuditService, AdminAuditService],
})
export class AuthorityModule {}
