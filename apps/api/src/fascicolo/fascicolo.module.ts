import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { UsersModule } from '../users/users.module';
import { FascicoloController } from './fascicolo.controller';
import { FascicoloService, FASCICOLO_REPOSITORY } from './fascicolo.service';
import { DrizzleFascicoloRepository } from './drizzle-fascicolo.repository';

@Module({
  imports: [DbModule, UsersModule],
  controllers: [FascicoloController],
  providers: [
    FascicoloService,
    DrizzleFascicoloRepository,
    { provide: FASCICOLO_REPOSITORY, useExisting: DrizzleFascicoloRepository },
  ],
  exports: [FascicoloService],
})
export class FascicoloModule {}
