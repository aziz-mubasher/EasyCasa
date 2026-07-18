import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { DrizzleProMeRepository } from './drizzle-pro-me.repository';
import { ProMeController } from './professional-me.controller';
import { ProMeService } from './professional-me.service';
import { PRO_ME_REPOSITORY } from './professional-me.types';

@Module({
  imports: [UsersModule],
  controllers: [ProMeController],
  providers: [
    ProMeService,
    { provide: PRO_ME_REPOSITORY, useClass: DrizzleProMeRepository },
  ],
})
export class ProfessionalMeModule {}
