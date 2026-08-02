import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { UsersModule } from '../users/users.module';
import { CrmController } from './crm.controller';
import { CrmHooksService } from './crm.hooks';
import { CrmPersonalDataSource } from './crm.personal-data';
import { CrmPrivacyBoot } from './crm.privacy-boot';
import { DrizzleCrmRepository } from './crm.repository';
import { CrmRetentionScheduler } from './crm.retention';
import { CrmRoleGuard } from './crm-role.guard';
import { CrmService } from './crm.service';
import { CRM_HOOKS, CRM_REPOSITORY } from './domain/ports';

/** Global so enquiry/viewing modules can `@Optional() @Inject(CRM_HOOKS)` without cycles. */
@Global()
@Module({
  imports: [UsersModule],
  controllers: [CrmController],
  providers: [
    CrmService,
    CrmHooksService,
    CrmRetentionScheduler,
    CrmPersonalDataSource,
    CrmPrivacyBoot,
    CrmRoleGuard,
    { provide: CRM_REPOSITORY, useClass: DrizzleCrmRepository },
    { provide: CRM_HOOKS, useExisting: CrmHooksService },
    // Global so @RequiresCrmRole is enforced even if a controller forgets @UseGuards.
    { provide: APP_GUARD, useExisting: CrmRoleGuard },
  ],
  exports: [CRM_HOOKS, CRM_REPOSITORY, CrmHooksService, CrmPersonalDataSource],
})
export class CrmModule {}
