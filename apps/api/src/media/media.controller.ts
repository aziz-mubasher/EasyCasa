import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { MediaService } from './media.service';
import { PresignDto, ConfirmMediaDto } from './dto/presign.dto';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { OptionalUser } from '../auth/optional-user.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { classifyMediaFileKey } from './media-file-access';
import { SellerQuotaService } from '../seller-quota/seller-quota.service';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

@Controller('media')
@Roles('seller', 'agent', 'partner', 'pro_marketer')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly users: UsersService,
    private readonly quota: SellerQuotaService,
  ) {}

  @Post('presign')
  async presign(
    @Body() dto: PresignDto,
    @CurrentUser() user: AuthUser,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const me = await this.users.getOrCreate(user);
    await this.users.assertNotSuspended(me.id);
    await this.quota.assertUploadAllowed(me.id, user, acceptLanguage);
    return this.media.presign(dto.listingId, dto.contentType);
  }

  @Post('confirm')
  async confirm(
    @Body() dto: ConfirmMediaDto,
    @CurrentUser() user: AuthUser,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const me = await this.users.getOrCreate(user);
    await this.users.assertNotSuspended(me.id);
    await this.quota.assertUploadAllowed(me.id, user, acceptLanguage);
    return this.media.confirm(dto.listingId, dto.key, dto.alt, me.id);
  }

  /**
   * Multipart upload proxied through the API (MinIO is not browser-reachable).
   * Field `file` + form field `listingId`.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES },
    }),
  )
  async upload(
    @UploadedFile()
    file:
      | {
          buffer?: Buffer;
          mimetype?: string;
          originalname?: string;
        }
      | undefined,
    @Body('listingId') listingId: string | undefined,
    @CurrentUser() user: AuthUser,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    if (!listingId?.trim()) throw new BadRequestException('listingId required');
    if (!file?.buffer?.length) throw new BadRequestException('file required');
    const me = await this.users.getOrCreate(user);
    await this.users.assertNotSuspended(me.id);
    await this.quota.assertUploadAllowed(me.id, user, acceptLanguage);
    return this.media.uploadListingImage(
      listingId.trim(),
      file.buffer,
      file.mimetype || 'application/octet-stream',
      file.originalname,
      me.id,
    );
  }

  /**
   * Read proxy — listing masters remain public; users/{id}/docs require
   * owner or admin (EC-S-T14.0). Soft-deny unknown shapes as 404.
   */
  @Public()
  @Roles()
  @Get('file/*')
  async serve(
    @Req() req: Request,
    @Res() res: Response,
    @OptionalUser() user: AuthUser | null,
  ): Promise<void> {
    const marker = '/media/file/';
    const idx = req.path.indexOf(marker);
    const key = idx >= 0 ? decodeURIComponent(req.path.slice(idx + marker.length)) : '';
    const access = classifyMediaFileKey(key);

    if (access.kind === 'deny') {
      throw new NotFoundException('media not found');
    }

    if (access.kind === 'private') {
      await this.assertPrivateDocAccess(user, access.ownerUserId);
    }

    const obj = await this.media.getObject(key);
    res.setHeader('Content-Type', obj.contentType);
    res.setHeader(
      'Cache-Control',
      access.kind === 'public'
        ? 'public, max-age=31536000, immutable'
        : 'private, no-store',
    );
    obj.body.pipe(res);
  }

  /** Owner match (app user id) or admin capability. Soft-fail → 401/403. */
  private async assertPrivateDocAccess(
    user: AuthUser | null,
    ownerUserId: string,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException('authentication required for private media');
    }
    if (user.capabilities?.includes('admin')) {
      return;
    }
    const me = await this.users.getOrCreate(user);
    if (me.id !== ownerUserId) {
      throw new ForbiddenException('not allowed to access this media');
    }
  }
}
