import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService, PROFESSIONAL_REPOSITORY } from './professionals.service';
import { DrizzleProfessionalRepository } from './drizzle-professional.repository';

@Module({
  imports: [UsersModule],
  controllers: [ProfessionalsController],
  providers: [
    ProfessionalsService,
    { provide: PROFESSIONAL_REPOSITORY, useClass: DrizzleProfessionalRepository },
  ],
  exports: [ProfessionalsService, PROFESSIONAL_REPOSITORY],
})
export class ProfessionalsModule {}
