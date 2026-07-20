import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { IsBoolean, IsIn, IsString, MinLength } from 'class-validator';
import { createHash } from 'node:crypto';
import type { Request } from 'express';

import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import {
  ConsentService,
  CURRENT_POLICY_VERSION,
  type ConsentPurpose,
} from './consent.service';
import { DsarService } from './dsar.service';
import { ErasureService } from './erasure.service';

const PURPOSES = ['privacy_policy', 'mediation_disclosure', 'marketing'] as const;

class RecordConsentDto {
  @IsIn(PURPOSES) purpose!: (typeof PURPOSES)[number];
  @IsBoolean() granted!: boolean;
  @IsString() @MinLength(1) policyVersion!: string;
}

/**
 * Data-subject rights endpoints (GDPR Art. 7, 15, 17) — Phase 38.
 * Subject is the logged-in internal user UUID (via UsersService.getOrCreate).
 */
@Controller('me/privacy')
export class DataSubjectController {
  constructor(
    private readonly dsar: DsarService,
    private readonly erasure: ErasureService,
    private readonly consent: ConsentService,
    private readonly users: UsersService,
  ) {}

  @Get('export')
  async export(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.dsar.export(me.id);
  }

  @Post('erase')
  async erase(@CurrentUser() user: AuthUser) {
    const me = await this.users.getOrCreate(user);
    return this.erasure.erase(me.id);
  }

  @Post('consents')
  async recordConsent(
    @CurrentUser() user: AuthUser,
    @Body() body: RecordConsentDto,
    @Req() req: Request,
  ) {
    const me = await this.users.getOrCreate(user);
    const ip = req.ip ?? req.socket?.remoteAddress;
    await this.consent.record({
      subjectId: me.id,
      purpose: body.purpose as ConsentPurpose,
      granted: body.granted,
      policyVersion: body.policyVersion || CURRENT_POLICY_VERSION,
      ipHash: ip ? createHash('sha256').update(ip).digest('hex').slice(0, 16) : undefined,
    });
    return { ok: true as const, policyVersion: body.policyVersion || CURRENT_POLICY_VERSION };
  }

  @Get('policy-version')
  policyVersion() {
    return { policyVersion: CURRENT_POLICY_VERSION };
  }
}
