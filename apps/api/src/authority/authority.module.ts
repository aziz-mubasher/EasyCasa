import { Global, Module } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { AdminAuditService } from './admin-audit.service';
import { AuthorityAuditService } from './authority-audit.service';
import { UnredactSessionStore } from './unredact-session.store';

@Global()
@Module({
  imports: [DbModule],
  providers: [AuthorityAuditService, AdminAuditService, UnredactSessionStore],
  exports: [AuthorityAuditService, AdminAuditService, UnredactSessionStore],
})
export class AuthorityModule {}
