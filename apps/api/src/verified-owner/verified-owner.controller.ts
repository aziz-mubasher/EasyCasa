import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { VerifiedOwnerEnabledGuard } from './verified-owner.guard';
import { VerifiedOwnerService } from './verified-owner.service';

function parseIntestatari(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      // single line
    }
    return [trimmed];
  }
  return [];
}

@Controller('seller/vo')
@UseGuards(VerifiedOwnerEnabledGuard)
export class VerifiedOwnerController {
  constructor(
    private readonly vo: VerifiedOwnerService,
    private readonly users: UsersService,
  ) {}

  @Roles('buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Get(':listingId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.vo.getForSeller(me.id, listingId);
  }

  @Roles('buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Post(':listingId/submit')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async submit(
    @CurrentUser() user: AuthUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() body: Record<string, unknown>,
    @UploadedFiles()
    files:
      | Array<{ buffer?: Buffer; originalname?: string }>
      | undefined,
  ) {
    const me = await this.users.getOrCreate(user);
    const uploaded = (files ?? [])
      .filter((f) => f.buffer?.length)
      .map((f) => ({
        buffer: f.buffer!,
        originalname: f.originalname || 'doc.pdf',
      }));
    if (!uploaded.length) throw new BadRequestException('files required');
    const intestatari = parseIntestatari(body.intestatari);
    if (!intestatari.length) throw new BadRequestException('intestatari required');
    return this.vo.submit({
      sellerUserId: me.id,
      listingId,
      intestatari,
      files: uploaded,
    });
  }
}
