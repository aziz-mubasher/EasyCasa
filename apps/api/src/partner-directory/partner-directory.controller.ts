import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';

import { Public } from '../auth/public.decorator';
import { PartnerDirectoryEnabledGuard } from './partner-directory.guard';
import { PartnerDirectoryService } from './partner-directory.service';

class DirectoryQueryDto {
  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

/** EC-S-T28/T29 — neutral, unauthenticated directory read (no fees, no ordering by payment). */
@Controller('partners/directory')
@Public()
@UseGuards(PartnerDirectoryEnabledGuard)
export class PartnerDirectoryController {
  constructor(private readonly directory: PartnerDirectoryService) {}

  @Get()
  list(@Query() q: DirectoryQueryDto) {
    return this.directory.listPublic({
      province: q.province,
      category: q.category,
    });
  }
}
