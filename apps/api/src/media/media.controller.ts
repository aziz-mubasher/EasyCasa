import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { MediaService } from './media.service';
import { PresignDto, ConfirmMediaDto } from './dto/presign.dto';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

@Controller('media')
@Roles('seller', 'agent', 'partner', 'pro_marketer')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('presign')
  presign(@Body() dto: PresignDto) {
    return this.media.presign(dto.listingId, dto.contentType);
  }

  @Post('confirm')
  confirm(@Body() dto: ConfirmMediaDto) {
    return this.media.confirm(dto.listingId, dto.key, dto.alt);
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
  upload(
    @UploadedFile()
    file:
      | {
          buffer?: Buffer;
          mimetype?: string;
          originalname?: string;
        }
      | undefined,
    @Body('listingId') listingId: string | undefined,
  ) {
    if (!listingId?.trim()) throw new BadRequestException('listingId required');
    if (!file?.buffer?.length) throw new BadRequestException('file required');
    return this.media.uploadListingImage(
      listingId.trim(),
      file.buffer,
      file.mimetype || 'application/octet-stream',
      file.originalname,
    );
  }

  /** Public read proxy — MEDIA_PUBLIC_BASE should point here (…/media/file). */
  @Public()
  @Roles()
  @Get('file/*')
  async serve(@Req() req: Request, @Res() res: Response): Promise<void> {
    const marker = '/media/file/';
    const idx = req.path.indexOf(marker);
    const key = idx >= 0 ? decodeURIComponent(req.path.slice(idx + marker.length)) : '';
    const obj = await this.media.getObject(key);
    res.setHeader('Content-Type', obj.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    obj.body.pipe(res);
  }
}
