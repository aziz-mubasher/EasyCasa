import { Module } from '@nestjs/common';

import { ProfessionalsModule } from '../professionals/professionals.module';
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
    { provide: ASSIGNMENT_REPOSITORY, useClass: DrizzleAssignmentRepository },
  ],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
