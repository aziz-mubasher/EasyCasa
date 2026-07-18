import { Module } from '@nestjs/common';

import { AmlController } from './aml.controller';
import { AmlService, AML_SCREENING, KYC_REPOSITORY } from './aml.service';
import { DrizzleKycRepository } from './drizzle-kyc.repository';
import { HttpAmlScreeningProvider } from './screening.provider';

@Module({
  controllers: [AmlController],
  providers: [
    AmlService,
    { provide: KYC_REPOSITORY, useClass: DrizzleKycRepository },
    { provide: AML_SCREENING, useClass: HttpAmlScreeningProvider },
  ],
  exports: [AmlService],
})
export class AmlModule {}
