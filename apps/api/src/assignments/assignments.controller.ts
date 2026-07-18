import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { Roles } from '../auth/roles.decorator';
import { AssignmentsService } from './assignments.service';
import {
  AssignDto,
  CreateTaskDto,
  DeliverDto,
  ListAssignmentsQueryDto,
  SetCredentialPolicyDto,
} from './dto';

@Controller()
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  @Get('assignments')
  @Roles('admin')
  list(@Query() query: ListAssignmentsQueryDto) {
    return this.service.listOpenOrByStatus(query.status);
  }

  @Post('assignments/tasks')
  @Roles('admin')
  createTask(@Body() dto: CreateTaskDto) {
    return this.service.createTask(dto);
  }

  @Get('assignments/:id/candidates')
  @Roles('admin')
  candidates(@Param('id') id: string) {
    return this.service.candidates(id);
  }

  @Post('assignments/:id/assign')
  @Roles('admin')
  assign(@Param('id') id: string, @Body() dto: AssignDto) {
    return this.service.assign(id, dto.professionalId);
  }

  @Post('assignments/:id/start')
  start(@Param('id') id: string) {
    return this.service.start(id);
  }

  @Post('assignments/:id/deliver')
  deliver(@Param('id') id: string, @Body() dto: DeliverDto) {
    return this.service.deliver(id, dto.deliverableUrl);
  }

  @Post('assignments/:id/approve')
  @Roles('admin')
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @Get('professionals/:professionalId/assignments')
  forProfessional(@Param('professionalId') professionalId: string) {
    return this.service.listForProfessional(professionalId);
  }

  @Get('admin/credential-policy')
  @Roles('admin')
  listPolicy() {
    return this.service.listCredentialPolicy();
  }

  @Patch('admin/credential-policy/:itemCode')
  @Roles('admin')
  setPolicy(@Param('itemCode') itemCode: string, @Body() dto: SetCredentialPolicyDto) {
    return this.service.setCredentialPolicy(itemCode, dto.requiredCredential).then(() => ({
      itemCode,
      requiredCredential: dto.requiredCredential,
    }));
  }
}
