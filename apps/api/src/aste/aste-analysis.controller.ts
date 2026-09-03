import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ASTE_REPORT_CONTENT_LANGS } from '@easycasa/shared';
import { IsIn, IsOptional } from 'class-validator';

import { RequiresAuth } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { AsteAnalysisEnabledGuard } from './aste-analysis.guard';
import { AsteAnalysisService } from './aste-analysis.service';
import { AsteCreditsService } from './aste-credits.service';
import { AsteTrialService } from './aste-trial.service';
import { hashRequestIp, isAuthEmailVerified } from './aste-trial-request';
import { AsteChatService } from './aste-chat.service';
import { AsteReportService } from './aste-report.service';
import {
  ASTE_DOC_TYPES,
  CreateAsteAnalysisDto,
  type AsteDocType,
} from './dto/create-aste-analysis.dto';
import { AsteChatAskDto } from './dto/aste-chat.dto';
import { PatchAsteAnalysisDto } from './dto/patch-aste-analysis.dto';

const MAX_BYTES = 50 * 1024 * 1024;

class DocTypeBody {
  @IsIn(ASTE_DOC_TYPES)
  docType!: AsteDocType;
}

class ReportQuery {
  @IsOptional()
  @IsIn([...ASTE_REPORT_CONTENT_LANGS])
  lang?: (typeof ASTE_REPORT_CONTENT_LANGS)[number];

  @IsOptional()
  @IsIn(['1', 'true', 'yes'])
  printed?: string;
}

@Controller('aste/analyses')
@RequiresAuth()
@UseGuards(AsteAnalysisEnabledGuard)
export class AsteAnalysisController {
  constructor(
    private readonly service: AsteAnalysisService,
    private readonly reports: AsteReportService,
    private readonly chat: AsteChatService,
    private readonly users: UsersService,
    private readonly credits: AsteCreditsService,
    private readonly trial: AsteTrialService,
  ) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAsteAnalysisDto,
    @Req() req: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ) {
    const me = await this.users.getOrCreate(user);
    const { bucketHash } = hashRequestIp(req);
    await this.trial.ensureFirstFileFree({
      userId: me.id,
      email: me.email ?? user.email,
      emailVerified: isAuthEmailVerified(user),
      bucketHash,
    });
    return this.service.create(me.id, {
      language: dto.language,
      register: dto.register,
      lottoLabel: dto.lottoLabel,
    });
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.service.list(me.id);
  }

  @Get(':id/report')
  async report(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: ReportQuery,
  ) {
    const me = await this.users.getOrCreate(user);
    const lang = query.lang ?? 'it';
    const trackPrint = query.printed === '1' || query.printed === 'true' || query.printed === 'yes';
    return this.reports.getReport(me.id, id, { lang, trackPrint, email: user.email });
  }

  @Get(':id/chat')
  async chatHistory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    return this.chat.history(me.id, id, user.email);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/chat')
  async chatAsk(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AsteChatAskDto,
  ) {
    const me = await this.users.getOrCreate(user);
    return this.chat.ask(me.id, id, { question: dto.question, lang: dto.lang }, user.email);
  }

  @Get(':id')
  async one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    return this.service.get(me.id, id);
  }

  @Patch(':id')
  async patch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PatchAsteAnalysisDto,
  ) {
    const me = await this.users.getOrCreate(user);
    if (dto.lottoLabel !== undefined) {
      await this.service.patchLottoLabel(me.id, id, dto.lottoLabel);
    }
    const hasBuyerPatch =
      dto.register !== undefined ||
      dto.residency !== undefined ||
      dto.purpose !== undefined ||
      dto.has_cf !== undefined ||
      dto.has_pec_firma !== undefined ||
      dto.financing_needed !== undefined ||
      dto.skip_buyer_profile !== undefined;
    if (hasBuyerPatch) {
      return this.reports.patchAnalysis(me.id, id, {
        register: dto.register,
        residency: dto.residency,
        purpose: dto.purpose,
        has_cf: dto.has_cf,
        has_pec_firma: dto.has_pec_firma,
        financing_needed: dto.financing_needed,
        skip_buyer_profile: dto.skip_buyer_profile,
      });
    }
    return this.service.get(me.id, id);
  }

  @Post(':id/resubmit')
  async resubmit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const me = await this.users.getOrCreate(user);
    return this.service.resubmit(me.id, id);
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
