import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { PropertiesService } from '../properties/properties.service';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto';

@Controller()
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    private readonly users: UsersService,
    private readonly properties: PropertiesService,
  ) {}

  /** Persist an accepted quote as a confirmed order (server recomputes pricing). */
  @Post('properties/:propertyId/orders')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateOrderDto,
  ) {
    const me = await this.users.getOrCreate(user);
    const p = await this.properties.get(propertyId);
    if (!user.roles.includes('admin') && p.ownerId !== me.id) {
      throw new ForbiddenException('not your property');
    }
    return this.service.create(propertyId, dto);
  }

  @Get('orders/:id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }
}
