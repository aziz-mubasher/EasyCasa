import { Body, Controller, Post } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { assertCasafariImporter } from './casafari/casafari-access';
import { CasafariCreateDto, CasafariCreateManyDto, CasafariPreviewDto } from './dto/casafari-import.dto';
import { ImportsService } from './imports.service';

@Controller('imports')
export class ImportsController {
  constructor(
    private readonly imports: ImportsService,
    private readonly users: UsersService,
  ) {}

  /**
   * Scrape a Casafari sharepage and return mapped listing drafts (no DB write).
   * Restricted to muba-seller / muba-admin. Up to 20 photo URLs per draft.
   */
  @Roles('seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Post('casafari/preview')
  preview(@Body() dto: CasafariPreviewDto, @CurrentUser() user: AuthUser) {
    assertCasafariImporter(user);
    return this.imports.previewCasafari(dto);
  }

  /**
   * Create a draft listing from one Casafari estate.
   */
  @Roles('seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Post('casafari/create')
  async create(@Body() dto: CasafariCreateDto, @CurrentUser() user: AuthUser) {
    assertCasafariImporter(user);
    const me = await this.users.getOrCreate(user);
    return this.imports.createFromCasafari(dto, me.id);
  }

  /**
   * Import every (or selected) estate from a Casafari share folder as drafts.
   */
  @Roles('seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Post('casafari/create-many')
  async createMany(@Body() dto: CasafariCreateManyDto, @CurrentUser() user: AuthUser) {
    assertCasafariImporter(user);
    const me = await this.users.getOrCreate(user);
    return this.imports.createManyFromCasafari(dto, me.id);
  }
}
