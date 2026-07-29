import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsUrl } from 'class-validator';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequiresAuth, RequiresCapability } from '../auth/capability.decorator';
import { RequiresRelationship } from '../auth/relationship.decorator';
import { SerializeFor } from '../auth/serialize-for.decorator';
import { UsersService } from '../users/users.service';
import { ProMeService } from './professional-me.service';

export class DeliverDto {
  @IsUrl({ require_tld: false })
  deliverableUrl!: string;
}

@Controller('me')
@RequiresAuth()
@RequiresCapability('professional')
@SerializeFor('professional')
export class ProMeController {
  constructor(
    private readonly service: ProMeService,
    private readonly users: UsersService,
  ) {}

  @Get('professional')
  async profile(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.service.profile(me.id);
  }

  @Get('assignments')
  async assignments(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.service.assignments(me.id);
  }

  @RequiresRelationship('assignment.self')
  @Post('assignments/:id/start')
  async start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    return this.service.start(me.id, id);
  }

  @RequiresRelationship('assignment.self')
  @Post('assignments/:id/deliver')
  async deliver(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DeliverDto,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.service.deliver(me.id, id, dto.deliverableUrl);
  }
}
