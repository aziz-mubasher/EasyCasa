import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { IsIn } from 'class-validator';

import { RequiresAuth } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { AsteAnalysisEnabledGuard } from './aste-analysis.guard';
import { AsteAnalysisService } from './aste-analysis.service';
import {
  ASTE_DOC_TYPES,
  CreateAsteAnalysisDto,
  type AsteDocType,
} from './dto/create-aste-analysis.dto';

const MAX_BYTES = 50 * 1024 * 1024;

class DocTypeBody {
  @IsIn(ASTE_DOC_TYPES)
  docType!: AsteDocType;
}

@Controller('aste/analyses')
@RequiresAuth()
@UseGuards(AsteAnalysisEnabledGuard)
export class AsteAnalysisController {
  constructor(
    private readonly service: AsteAnalysisService,
    private readonly users: UsersService,
  ) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateAsteAnalysisDto) {
    const me = await this.users.getOrCreate(user);
    return this.service.create(me.id, {
      language: dto.language,
      register: dto.register,
    });
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.service.list(me.id);
  }

  @Get(':id')
  async one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    return this.service.get(me.id, id);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_BYTES },
    }),
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile()
    file:
      | {
          buffer?: Buffer;
          mimetype?: string;
          originalname?: string;
          size?: number;
        }
      | undefined,
    @Body() body: DocTypeBody,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.service.uploadDocument(
      me.id,
      id,
      {
        buffer: file?.buffer ?? Buffer.alloc(0),
        mimetype: file?.mimetype || 'application/octet-stream',
        originalname: file?.originalname || 'document',
        size: file?.size ?? file?.buffer?.length ?? 0,
      },
      body.docType,
    );
  }

  @Post(':id/submit')
  async submit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    return this.service.submit(me.id, id);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    return this.service.remove(me.id, id);
  }
}
