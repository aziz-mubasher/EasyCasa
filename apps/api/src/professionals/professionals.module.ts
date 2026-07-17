import { Module } from '@nestjs/common';

import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService, PROFESSIONAL_REPOSITORY } from './professionals.service';
import { DrizzleProfessionalRepository } from './drizzle-professional.repository';

@Module({
  controllers: [ProfessionalsController],
  providers: [
    ProfessionalsService,
    { provide: PROFESSIONAL_REPOSITORY, useClass: DrizzleProfessionalRepository },
  ],
  exports: [ProfessionalsService, PROFESSIONAL_REPOSITORY],
})
export class ProfessionalsModule {}
