import { Controller, Get } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { Public } from '../auth/public.decorator';

@Controller('version')
export class VersionController {
  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  @Public()
  @Get()
  version(): { service: string; gitSha: string; builtAt: string } {
    return {
      service: 'api',
      gitSha: this.config.GIT_SHA.trim() || 'unknown',
      builtAt: this.config.BUILD_TIME.trim() || 'unknown',
    };
  }
}
