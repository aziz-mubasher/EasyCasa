import { Controller, Get } from '@nestjs/common';

import { Public } from '../auth/public.decorator';

@Controller('version')
export class VersionController {
  @Public()
  @Get()
  version(): { service: string; gitSha: string; builtAt: string } {
    return {
      service: 'api',
      gitSha: process.env.GIT_SHA?.trim() || 'unknown',
      builtAt: process.env.BUILD_TIME?.trim() || 'unknown',
    };
  }
}
