import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@easycasa/shared';
import { Public } from '../auth/public.decorator';
import { AmlAdapter } from '../config/adapters/aml.adapter';
import { MeiliAdapter } from '../config/adapters/meili.adapter';
import { NotificationsAdapter } from '../config/adapters/notifications.adapter';
import { PspAdapter } from '../config/adapters/psp.adapter';
import { RliAdapter } from '../config/adapters/rli.adapter';
import { SdiAdapter } from '../config/adapters/sdi.adapter';
import { SignatureAdapter } from '../config/adapters/signature.adapter';
import type { SeamStatus } from '../config/adapters/seam';

@Controller('health')
export class HealthController {
  constructor(
    private readonly psp: PspAdapter,
    private readonly sdi: SdiAdapter,
    private readonly aml: AmlAdapter,
    private readonly rli: RliAdapter,
    private readonly signature: SignatureAdapter,
    private readonly notifications: NotificationsAdapter,
    private readonly meili: MeiliAdapter,
  ) {}

  @Public()
  @Get()
  check(): HealthStatus & { seams: SeamStatus[] } {
    return {
      status: 'ok',
      service: 'api',
      time: new Date().toISOString(),
      seams: [
        this.psp.status(),
        this.sdi.status(),
        this.aml.status(),
        this.rli.status(),
        this.signature.status(),
        this.notifications.status(),
        this.meili.status(),
      ],
    };
  }
}
