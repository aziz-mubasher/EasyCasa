import { Global, Module } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { AuthorityAuditService } from './authority-audit.service';

@Global()
@Module({
  imports: [DbModule],
  providers: [AuthorityAuditService],
  exports: [AuthorityAuditService],
})
export class AuthorityModule {}
