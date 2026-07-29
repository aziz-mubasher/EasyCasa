import { Body, Controller, Post } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { CasafariCreateDto, CasafariPreviewDto } from './dto/casafari-import.dto';
import { ImportsService } from './imports.service';

@Controller('imports')
export class ImportsController {
  constructor(
    private readonly imports: ImportsService,
    private readonly users: UsersService,
  ) {}

  /**
   * Scrape a Casafari sharepage and return mapped listing drafts (no DB write).
   * Up to 10 photo URLs per draft by default.
   */
  @Roles('seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Post('casafari/preview')
  preview(@Body() dto: CasafariPreviewDto) {
    return this.imports.previewCasafari(dto);
  }

  /**
   * Create a draft listing from a Casafari sharepage estate and download photos
   * into EasyCasa media storage (default 10 images).
   */
  @Roles('seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Post('casafari/create')
  async create(@Body() dto: CasafariCreateDto, @CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.imports.createFromCasafari(dto, me.id);
  }
}
