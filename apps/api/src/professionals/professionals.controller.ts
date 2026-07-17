import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';

import { Roles } from '../auth/roles.decorator';
import { ProfessionalsService } from './professionals.service';
import { AddCredentialDto, CreateProfessionalDto, SetCredentialStatusDto } from './dto';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly service: ProfessionalsService) {}

  @Get()
  @Roles('admin')
  list() {
    return this.service.list();
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateProfessionalDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post(':id/credentials')
  addCredential(@Param('id') id: string, @Body() dto: AddCredentialDto) {
    return this.service.addCredential(id, dto);
  }

  /** Admin: verify or reject a credential. */
  @Put(':id/credentials/status')
  @Roles('admin')
  setStatus(@Param('id') id: string, @Body() dto: SetCredentialStatusDto) {
    return this.service.setCredentialStatus(id, dto.type, dto.status);
  }
}
