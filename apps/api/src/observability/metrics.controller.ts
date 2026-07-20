import { Controller, Get, Header } from '@nestjs/common';

import { Public } from '../auth/public.decorator';
import { registry } from './metrics';

/** `/metrics` in Prometheus text format. Public; restrict at the edge/network. */
@Controller('metrics')
export class MetricsController {
  @Public()
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async metrics(): Promise<string> {
    return registry.metrics();
  }
}
