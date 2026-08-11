import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';

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

@Controller('partners/directory')
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
