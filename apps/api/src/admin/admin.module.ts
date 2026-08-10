import { Module } from '@nestjs/common';

import { AssignmentsModule } from '../assignments/assignments.module';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { VerifiedOwnerModule } from '../verified-owner/verified-owner.module';
import { AdminController } from './admin.controller';
import { AdminDsarController } from './admin-dsar.controller';
import { AdminIdentityReviewsController } from './admin-identity-reviews.controller';
import { AdminListingReportsController } from './admin-listing-reports.controller';
import { AdminVoModerationController } from './admin-vo-moderation.controller';

/** Privacy services come from global PrivacyModule.forRoot (Phase 39.1). */
@Module({
  imports: [OrdersModule, AssignmentsModule, UsersModule, VerifiedOwnerModule],
  controllers: [
    AdminController,
    AdminDsarController,
    AdminListingReportsController,
    AdminIdentityReviewsController,
    AdminVoModerationController,
  ],
})
export class AdminModule {}
