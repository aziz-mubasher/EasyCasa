import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  CanActivate,
  Injectable,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString } from 'class-validator';
import { isSellerChecklistTypeCode } from '@easycasa/shared';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { SellerChecklistService } from './seller-checklist.service';

@Injectable()
export class SellerChecklistEnabledGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}
  canActivate(): boolean {
    if (!this.config.SELLER_CHECKLIST_ENABLED) throw new NotFoundException();
    return true;
  }
}

class AttachDto {
  @IsString()
  typeCode!: string;
}

class RemoveDto {
  @IsString()
  typeCode!: string;
}

@Controller('seller/checklist')
@UseGuards(SellerChecklistEnabledGuard)
export class SellerChecklistController {
  constructor(
    private readonly checklist: SellerChecklistService,
    private readonly users: UsersService,
  ) {}

  @Roles('buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Get(':listingId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.checklist.getForSeller(me.id, listingId);
  }

  @Roles('buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Post(':listingId/docs')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async attach(
    @CurrentUser() user: AuthUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() body: AttachDto,
    @UploadedFile()
    file: { buffer?: Buffer; originalname?: string } | undefined,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('file required');
    if (!isSellerChecklistTypeCode(body.typeCode)) {
      throw new BadRequestException('invalid typeCode');
    }
    const me = await this.users.getOrCreate(user);
    return this.checklist.attachDoc({
      sellerUserId: me.id,
      listingId,
      typeCode: body.typeCode,
      file: { buffer: file.buffer, originalname: file.originalname || 'doc.pdf' },
    });
  }

  @Roles('buyer', 'seller', 'agent', 'partner', 'pro_marketer', 'admin')
  @Post(':listingId/docs/remove')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() body: RemoveDto,
  ) {
    if (!isSellerChecklistTypeCode(body.typeCode)) {
      throw new BadRequestException('invalid typeCode');
    }
    const me = await this.users.getOrCreate(user);
    return this.checklist.removeDoc({
      sellerUserId: me.id,
      listingId,
      typeCode: body.typeCode,
    });
  }
}
