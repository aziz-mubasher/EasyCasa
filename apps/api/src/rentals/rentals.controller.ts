import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { Roles } from '../auth/roles.decorator';
import { RentalsService } from './rentals.service';
import { LeaseDto, RegisterLeaseDto } from './dto';

@Controller()
export class RentalsController {
  constructor(private readonly service: RentalsService) {}

  @Post('leases/preview')
  preview(@Body() dto: LeaseDto) {
    return this.service.preview(dto);
  }

  @Post('properties/:propertyId/leases')
  create(@Param('propertyId') propertyId: string, @Body() dto: LeaseDto) {
    return this.service.create(propertyId, dto);
  }

  @Get('leases/:id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Get('leases/:id/rli-payload')
  payload(@Param('id') id: string) {
    return this.service.payload(id);
  }

  @Post('leases/:id/register')
  register(@Param('id') id: string, @Body() dto: RegisterLeaseDto) {
    return this.service.register(id, dto);
  }

  @Get('admin/leases/deadlines')
  @Roles('admin')
  deadlines(@Query('withinDays') withinDays?: string) {
    const n = withinDays ? Number(withinDays) : 7;
    return this.service.deadlineMonitor(Number.isFinite(n) ? n : 7);
  }
}
