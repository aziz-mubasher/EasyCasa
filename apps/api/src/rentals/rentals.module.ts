import { Module, forwardRef } from '@nestjs/common';

import { AmlModule } from '../aml/aml.module';
import { RentalsController } from './rentals.controller';
import { RentalsService, LEASE_REPOSITORY, RLI_CHANNEL } from './rentals.service';
import { DrizzleLeaseRepository } from './drizzle-lease.repository';
import { EntratelRliChannel } from './rli-channel';

@Module({
  imports: [forwardRef(() => AmlModule)],
  controllers: [RentalsController],
  providers: [
    RentalsService,
    { provide: LEASE_REPOSITORY, useClass: DrizzleLeaseRepository },
    { provide: RLI_CHANNEL, useClass: EntratelRliChannel },
  ],
  exports: [RentalsService],
})
export class RentalsModule {}
