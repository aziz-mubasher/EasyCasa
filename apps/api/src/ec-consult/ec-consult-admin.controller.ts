import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsString } from 'class-validator';

import { RequiresCapability } from '../auth/capability.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { EcConsultOrchestratorService } from './ec-consult-orchestrator.service';
import { mergeInboxSources } from './inbox-merge';

class HumanReplyBody {
  @IsString()
  text!: string;
}

@Controller('admin/whatsapp/ec-consult')
@RequiresCapability('whatsapp:inbound:read')
export class EcConsultAdminController {
  constructor(
    private readonly orchestrator: EcConsultOrchestratorService,
    private readonly users: UsersService,
  ) {}

  @Get('status')
  status() {
    const rt = this.orchestrator.runtime();
    return {
      lineEnabled: rt.lineEnabled,
      dryRun: rt.dryRun,
      inboxSource: rt.inboxSource,
      canSend: rt.canSend,
      missingEnv: rt.missingEnv,
    };
  }

  @Get('threads')
  listThreads() {
    const rt = this.orchestrator.runtime();
    const webhook = this.orchestrator.store.listThreads().map((t) => ({
      waId: t.waId,
      preview: t.preview,
      lastAt: t.lastAt,
      source: 'webhook' as const,
    }));
    const merged = mergeInboxSources(rt.inboxSource, webhook, []);
    return { inboxSource: rt.inboxSource, active: merged.active, elevenlabsHistory: merged.history };
  }

  @Get('threads/:waId')
  threadDetail(@Param('waId') waId: string) {
    const state = this.orchestrator.store.getState(waId);
    const messages = this.orchestrator.store.listMessages(waId);
    return {
      waId,
      state,
      aiPaused: Boolean(state.aiPausedUntil && new Date(state.aiPausedUntil).getTime() > Date.now()),
      messages,
    };
  }

  @Post('threads/:waId/reply')
  @RequiresCapability('whatsapp:inbound:reply')
  async humanReply(
    @Param('waId') waId: string,
    @Body() body: HumanReplyBody,
    @CurrentUser() user: AuthUser,
  ) {
    await this.users.getOrCreate(user);
    const text = body.text.trim();
    this.orchestrator.store.appendMessage(waId, {
      id: `human-${Date.now()}`,
      waId,
      direction: 'out',
      author: 'human',
      body: text,
      receivedAt: new Date().toISOString(),
    });
    this.orchestrator.pauseAfterHumanReply(waId);
    return { ok: true, aiPausedUntil: this.orchestrator.store.getState(waId).aiPausedUntil };
  }

  @Post('threads/:waId/resume-ai')
  @RequiresCapability('whatsapp:inbound:reply')
  async resumeAi(@Param('waId') waId: string, @CurrentUser() user: AuthUser) {
    await this.users.getOrCreate(user);
    const state = this.orchestrator.store.getState(waId);
    this.orchestrator.store.setState(waId, { ...state, aiPausedUntil: null });
    return { ok: true };
  }
}