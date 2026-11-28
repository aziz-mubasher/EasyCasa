import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { AdminAuditService } from '../authority/admin-audit.service';
import templateCorpus from './intake/EC_WA_templates_v1.json';
import { approvedLanguageCodes } from './intake/rules';
import { redactPreview } from './redact';
import { WhatsAppCloudClient } from './whatsapp-cloud.client';
import {
  isLiveConversationId,
  mapLiveDetail,
  mapLiveSummary,
  outboundTemplateBody,
  type LiveDetail,
  type LiveSummary,
} from './whatsapp-live-inbox.client';

const FOLLOW_UP = 'ec_request_followup';

type CorpusLocale = { meta_language: string; body: string };

function followUpLocales(): Record<string, CorpusLocale> {
  const templates = templateCorpus.templates as Record<string, Record<string, CorpusLocale>>;
  return templates[FOLLOW_UP] ?? {};
}

export function archiveSendsOnLiveNumber(nestPhoneId: string, livePhoneId: string): boolean {
  const nest = nestPhoneId.trim();
  const live = livePhoneId.trim();
  return nest !== '' && nest === live;
}

@Injectable()
export class WhatsAppLiveInboxService {
  constructor(
    @InjectConfig() private readonly config: ApiConfig,
    private readonly audit: AdminAuditService,
    private readonly cloud: WhatsAppCloudClient,
  ) {}

  status() {
    const phone = this.config.WHATSAPP_LIVE_PHONE_NUMBER_ID.trim();
    return {
      configured: this.config.ELEVENLABS_API_KEY.trim() !== '',
      phoneLast4: phone.length >= 4 ? phone.slice(-4) : null,
      archiveSendsOnLiveNumber: archiveSendsOnLiveNumber(
        this.config.WHATSAPP_PHONE_NUMBER_ID,
        phone,
      ),
      templateName: FOLLOW_UP,
      locales: Object.keys(followUpLocales()),
    };
  }

  async list(): Promise<{ items: Array<Omit<LiveSummary, 'preview'> & { preview: string }> }> {
    const json = await this.elevenFetch(
      `/v1/convai/conversations?${new URLSearchParams({
        whatsapp_phone_number_ids: this.config.WHATSAPP_LIVE_PHONE_NUMBER_ID.trim(),
        conversation_initiation_source: 'whatsapp',
        summary_mode: 'include',
        page_size: '30',
      }).toString()}`,
    );
    const rows = json && typeof json === 'object' && Array.isArray((json as { conversations?: unknown }).conversations)
      ? (json as { conversations: unknown[] }).conversations
      : [];
    const items = rows
      .map((row) => mapLiveSummary(row))
      .filter((row): row is LiveSummary => row != null)
      .map((row) => ({ ...row, preview: redactPreview(row.preview) }));
    return { items };
  }

  async detail(conversationId: string, actorUserId: string): Promise<Omit<LiveDetail, 'whatsappUserId' | 'phoneNumberId'> & { turns: LiveDetail['turns'] }> {
    const detail = await this.loadOwn(conversationId);
    await this.audit.record({
      actorUserId,
      action: 'whatsapp_live_reveal',
      resourceType: 'whatsapp_live_conversation',
      resourceId: conversationId,
      reason: 'operator opened live thread',
    });
    return {
      conversationId: detail.conversationId,
      startedAt: detail.startedAt,
      turns: detail.turns.map((turn) => ({ ...turn, text: redactPreview(turn.text) })),
    };
  }

  async sendFollowUp(
    conversationId: string,
    actorUserId: string,
    input: { staffName: string; subject: string; locale: string },
  ) {
    const staffName = input.staffName.replace(/\s+/g, ' ').trim();
    const subject = input.subject.replace(/\s+/g, ' ').trim();
    const locale = input.locale.trim();
    const pack = followUpLocales()[locale];
    if (!staffName || !subject) throw new BadRequestException('name and subject are required');
    if (staffName.length > 80 || subject.length > 200) throw new BadRequestException('follow-up text is too long');
    if (!pack) throw new BadRequestException('follow-up language is not in the template pack');
    await this.assertApproved(pack.meta_language, locale);
    const detail = await this.loadOwn(conversationId);
    if (!detail.whatsappUserId) throw new BadRequestException('this chat has no WhatsApp recipient');
    const body = outboundTemplateBody({
      phoneNumberId: this.config.WHATSAPP_LIVE_PHONE_NUMBER_ID.trim(),
      whatsappUserId: detail.whatsappUserId,
      templateName: FOLLOW_UP,
      languageCode: pack.meta_language,
      bodyParams: [staffName, subject],
      agentId: this.config.WHATSAPP_LIVE_AGENT_ID.trim(),
    });
    const sent = await this.elevenFetch('/v1/convai/whatsapp/outbound-message', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const conversation = sent && typeof sent === 'object' ? (sent as { conversation_id?: unknown }).conversation_id : null;
    await this.audit.record({
      actorUserId,
      action: 'whatsapp_live_template',
      resourceType: 'whatsapp_live_conversation',
      resourceId: conversationId,
      reason: `template=${FOLLOW_UP} locale=${locale}`,
    });
    return {
      templateName: FOLLOW_UP,
      locale,
      providerConversationId: typeof conversation === 'string' ? conversation : null,
    };
  }

  private async assertApproved(metaLanguage: string, locale: string): Promise<void> {
    const rows = await this.cloud.templateLanguageStatuses(FOLLOW_UP);
    const approved = approvedLanguageCodes(rows);
    if (approved == null || approved.length === 0) return;
    if (!approved.includes(metaLanguage) && !approved.includes(locale)) {
      throw new BadRequestException('template not approved in this language');
    }
  }

  private async loadOwn(conversationId: string): Promise<LiveDetail> {
    if (!isLiveConversationId(conversationId)) throw new NotFoundException('conversation not found');
    const json = await this.elevenFetch(`/v1/convai/conversations/${conversationId}`);
    const detail = mapLiveDetail(json);
    if (!detail) throw new NotFoundException('conversation not found');
    const live = this.config.WHATSAPP_LIVE_PHONE_NUMBER_ID.trim();
    if (detail.phoneNumberId !== live) {
      throw new NotFoundException('conversation not found');
    }
    return detail;
  }

  private async elevenFetch(path: string, init?: RequestInit): Promise<unknown> {
    const key = this.config.ELEVENLABS_API_KEY.trim();
    if (!key) throw new ServiceUnavailableException('live WhatsApp line is not configured');
    const base = this.config.ELEVENLABS_API_BASE_URL.replace(/\/$/, '');
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = json && typeof json === 'object' && 'detail' in json ? String((json as { detail: unknown }).detail) : res.statusText;
      throw new BadRequestException(`live line refused the request (${detail})`);
    }
    return json;
  }
}
