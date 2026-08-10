import { Module } from '@nestjs/common';

import { OmiBandService } from './omi-band.service';
import { OmiController } from './omi.controller';
import { OmiZoneService } from './omi-zone.service';

@Module({
  controllers: [OmiController],
  providers: [OmiZoneService, OmiBandService],
  exports: [OmiZoneService, OmiBandService],
})
export class OmiModule {}
