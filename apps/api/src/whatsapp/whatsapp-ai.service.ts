import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';

import { parseWaAiLocale, type WaAiLocale } from '@easycasa/shared';

import { AdminAuditService } from '../authority/admin-audit.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { waInboundMessages, waThreadOutbound } from '../db/schema';
import {
  composeSystemPrompt,
  composeUserPrompt,
  parseClaudeJsonObject,
  translateSystemPrompt,
  translateUserPrompt,
  waAiForbiddenReason,
} from './whatsapp-ai.prompts';
import { WhatsAppClaudeClient } from './whatsapp-claude.client';
import { WhatsAppInboundAdminService } from './whatsapp-inbound-admin.service';

const PROMPT_MAX = 2000;
const TEXT_MAX = 4096;
const DRAFT_MAX = 4096;
const THREAD_LIMIT = 10;

export type WaAiComposeResult = {
  refused: boolean;
  draft: string | null;
  reason: string | null;
  locale: WaAiLocale;
  model: string;
  configured: true;
};

export type WaAiTranslateResult = {
  isEnglish: boolean;
  detectedLanguage: string;
  translation: string;
  model: string;
  configured: true;
};

@Injectable()
export class WhatsAppAiService {
  constructor(
    private readonly claude: WhatsAppClaudeClient,
    private readonly inboundAdmin: WhatsAppInboundAdminService,
    private readonly audit: AdminAuditService,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  status() {
    return {
      configured: this.claude.configured,
      model: this.claude.model,
      autoSend: false,
      locales: ['it', 'en', 'es', 'fr', 'de', 'pt', 'ur', 'hi', 'pa', 'ar'],
    };
  }

  async compose(input: {
    handle: string;
    actorUserId: string;
    prompt: string;
    locale?: string | null;
    includeThread?: boolean;
  }): Promise<WaAiComposeResult> {
    this.requireClaude();
    const prompt = input.prompt.trim();
    if (!prompt) throw new BadRequestException('prompt required');
    if (prompt.length > PROMPT_MAX) {
      throw new BadRequestException(`prompt exceeds ${PROMPT_MAX} characters`);
    }

    const localRefuse = waAiForbiddenReason(prompt);
    if (localRefuse) {
      await this.auditAi(input.actorUserId, 'whatsapp_ai_compose', input.handle, `refused ${localRefuse}`);
      return {
        refused: true,
        draft: null,
        reason: localRefuse,
        locale: parseWaAiLocale(input.locale),
        model: this.claude.model,
        configured: true,
      };
    }

    const locale = parseWaAiLocale(input.locale);
    const waId = await this.inboundAdmin.resolveHandle(input.handle);
    const thread =
      input.includeThread === false ? null : await this.threadContext(waId);

    const completion = await this.claude.complete(
      composeSystemPrompt(locale),
      composeUserPrompt({ locale, prompt, thread }),
    );
    if (!completion.ok) this.throwClaude(completion.reason, completion.message);

    const parsed = parseClaudeJsonObject(completion.text);
    const refused = parsed?.refused === true;
    const reason =
      refused && typeof parsed?.reason === 'string' && parsed.reason.trim()
        ? parsed.reason.trim()
        : refused
          ? 'Claude refused this draft'
          : null;
    let draft =
      !refused && typeof parsed?.draft === 'string'
        ? parsed.draft.trim()
        : !refused && !parsed
          ? completion.text.trim()
          : '';

    if (draft.length > DRAFT_MAX) draft = draft.slice(0, DRAFT_MAX).trim();

    if (!refused && draft) {
      const draftRefuse = waAiForbiddenReason(draft);
      if (draftRefuse) {
        await this.auditAi(input.actorUserId, 'whatsapp_ai_compose', waId, `draft_blocked ${draftRefuse}`);
        return {
          refused: true,
          draft: null,
          reason: draftRefuse,
          locale,
          model: completion.model,
          configured: true,
        };
      }
    }

    if (!refused && !draft) {
      throw new BadGatewayException('Claude returned an empty draft');
    }

    await this.auditAi(
      input.actorUserId,
      'whatsapp_ai_compose',
      waId,
      refused ? `refused ${reason ?? 'policy'}` : `draft ${locale} ${draft.length}c`,
    );

    return {
      refused,
      draft: refused ? null : draft,
      reason,
      locale,
      model: completion.model,
      configured: true,
    };
  }

  async translate(input: {
    handle: string;
    actorUserId: string;
    text?: string | null;
    messageId?: string | null;
  }): Promise<WaAiTranslateResult> {
    this.requireClaude();
    const waId = await this.inboundAdmin.resolveHandle(input.handle);
    const text = (input.text?.trim() || (await this.bodyForMessage(waId, input.messageId))).trim();
    if (!text) throw new BadRequestException('text required');
    if (text.length > TEXT_MAX) {
      throw new BadRequestException(`text exceeds ${TEXT_MAX} characters`);
    }

    const completion = await this.claude.complete(
      translateSystemPrompt(),
      translateUserPrompt(text),
      800,
    );
    if (!completion.ok) this.throwClaude(completion.reason, completion.message);

    const parsed = parseClaudeJsonObject(completion.text);
    const translation =
      (typeof parsed?.translation === 'string' && parsed.translation.trim()) ||
      (!parsed ? completion.text.trim() : '');
    if (!translation) {
      throw new BadGatewayException('Claude returned an empty translation');
    }

    const detected =
      typeof parsed?.detectedLanguage === 'string' && parsed.detectedLanguage.trim()
        ? parsed.detectedLanguage.trim().toLowerCase().slice(0, 8)
        : 'und';
    const isEnglish = parsed?.isEnglish === true || detected === 'en';

    await this.auditAi(
      input.actorUserId,
      'whatsapp_ai_translate',
      waId,
      `${detected} ${isEnglish ? 'en' : 'to_en'} ${translation.length}c`,
    );

    return {
      isEnglish,
      detectedLanguage: detected,
      translation: translation.slice(0, TEXT_MAX),
      model: completion.model,
      configured: true,
    };
  }

  private requireClaude() {
    if (!this.claude.configured) {
      throw new ServiceUnavailableException(
        'Claude is not configured — set ANTHROPIC_API_KEY on the API',
      );
    }
  }

  private throwClaude(reason: string, message?: string): never {
    if (reason === 'not_configured') {
      throw new ServiceUnavailableException(
        'Claude is not configured — set ANTHROPIC_API_KEY on the API',
      );
    }
    throw new BadGatewayException(message || `Claude request failed (${reason})`);
  }

  private async auditAi(
    actorUserId: string,
    action: 'whatsapp_ai_compose' | 'whatsapp_ai_translate',
    resourceId: string,
    reason: string,
  ) {
    await this.audit.record({
      actorUserId,
      action,
      resourceType: 'wa_inbound_thread',
      resourceId,
      reason,
    });
  }

  private async bodyForMessage(waId: string, messageId?: string | null): Promise<string> {
    if (messageId?.trim()) {
      const row = await this.db
        .select({ body: waInboundMessages.body, waId: waInboundMessages.waId })
        .from(waInboundMessages)
        .where(eq(waInboundMessages.id, messageId.trim()))
        .limit(1);
      if (!row[0] || row[0].waId !== waId) {
        throw new BadRequestException('message not found on this thread');
      }
      return row[0].body ?? '';
    }
    const latest = await this.db
      .select({ body: waInboundMessages.body })
      .from(waInboundMessages)
      .where(eq(waInboundMessages.waId, waId))
      .orderBy(asc(waInboundMessages.receivedAt))
      .limit(50);
    const withBody = [...latest].reverse().find((r) => r.body?.trim());
    return withBody?.body ?? '';
  }

  private async threadContext(waId: string): Promise<string | null> {
    const inbound = await this.db
      .select({
        at: waInboundMessages.receivedAt,
        body: waInboundMessages.body,
      })
      .from(waInboundMessages)
      .where(eq(waInboundMessages.waId, waId))
      .orderBy(asc(waInboundMessages.receivedAt))
      .limit(40);
    const outbound = await this.db
      .select({
        at: waThreadOutbound.sentAt,
        body: waThreadOutbound.body,
      })
      .from(waThreadOutbound)
      .where(eq(waThreadOutbound.waId, waId))
      .orderBy(asc(waThreadOutbound.sentAt))
      .limit(40);

    const items = [
      ...inbound
        .filter((r) => r.body?.trim())
        .map((r) => ({ at: r.at.getTime(), line: `Customer: ${r.body!.trim()}` })),
      ...outbound
        .filter((r) => r.body?.trim())
        .map((r) => ({ at: r.at.getTime(), line: `Staff: ${r.body!.trim()}` })),
    ]
      .sort((a, b) => a.at - b.at)
      .slice(-THREAD_LIMIT);

    if (!items.length) return null;
    return items.map((i) => i.line).join('\n');
  }
}
