import { Body, Controller, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { MediaService } from './media.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';

class UploadPresignDto {
  @IsString() @MinLength(1) filename!: string;
  @IsString() @MinLength(3) contentType!: string;
}

@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly media: MediaService,
    private readonly users: UsersService,
  ) {}

  /** Presigned PUT for owner fascicolo documents (Phase 9). */
  @Post('presign')
  async presign(@CurrentUser() user: AuthUser, @Body() dto: UploadPresignDto) {
    const me = await this.users.getOrCreate(user);
    return this.media.presignForUser(me.id, dto.filename, dto.contentType);
  }
}
