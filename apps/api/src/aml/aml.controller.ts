import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { Roles } from '../auth/roles.decorator';
import { AmlService } from './aml.service';
import { KycEventDto, OpenKycDto } from './dto';

@Controller('aml/cases')
export class AmlController {
  constructor(private readonly service: AmlService) {}

  @Post()
  open(@Body() dto: OpenKycDto) {
    return this.service.open({
      subjectRef: dto.subjectRef,
      fullName: dto.fullName,
      countryCode: dto.countryCode,
      factors: {
        nonEuId: dto.nonEuId,
        cashPayment: dto.cashPayment,
        highValue: dto.highValue,
        identityMismatch: dto.identityMismatch,
      },
    });
  }

  @Get()
  @Roles('admin')
  list() {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post(':id/events')
  advance(@Param('id') id: string, @Body() dto: KycEventDto) {
    return this.service.advance(id, dto.event);
  }
}
