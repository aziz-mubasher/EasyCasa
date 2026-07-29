import { Module } from '@nestjs/common';

import { ProfessionalsModule } from '../professionals/professionals.module';
import { CoverageAvailabilityService } from '../professionals/coverage-availability.service';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService, ASSIGNMENT_REPOSITORY } from './assignments.service';
import { DrizzleAssignmentRepository } from './drizzle-assignment.repository';
import { DefaultCredentialPolicy } from './credential-policy';

@Module({
  imports: [ProfessionalsModule],
  controllers: [AssignmentsController],
  providers: [
    AssignmentsService,
    DefaultCredentialPolicy,
    CoverageAvailabilityService,
    { provide: ASSIGNMENT_REPOSITORY, useClass: DrizzleAssignmentRepository },
  ],
  exports: [AssignmentsService, DefaultCredentialPolicy, CoverageAvailabilityService],
})
export class AssignmentsModule {}
