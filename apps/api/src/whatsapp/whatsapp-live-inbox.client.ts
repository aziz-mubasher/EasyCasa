/**
 * ElevenLabs owns the live Easy Casa Italia WhatsApp number.
 * Meta delivers that line to the front-desk agent, not the Nest webhook.
 */

const CONVERSATION_ID = /^conv_[a-z0-9]{8,64}$/;

export type LiveSummary = {
  conversationId: string;
  startedAt: string | null;
  preview: string;
};

export type LiveTurn = {
  role: 'customer' | 'agent';
  text: string;
  atSeconds: number | null;
};

export type LiveDetail = {
  conversationId: string;
  startedAt: string | null;
  turns: LiveTurn[];
  phoneNumberId: string | null;
  whatsappUserId: string | null;
};

export function isLiveConversationId(id: string): boolean {
  return CONVERSATION_ID.test(id);
}

export function outboundTemplateBody(input: {
  phoneNumberId: string;
  whatsappUserId: string;
  templateName: string;
  languageCode: string;
  bodyParams: string[];
  agentId: string;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    whatsapp_phone_number_id: input.phoneNumberId,
    whatsapp_user_id: input.whatsappUserId,
    template_name: input.templateName,
    template_language_code: input.languageCode,
    agent_id: input.agentId,
  };
  if (input.bodyParams.length > 0) {
    body.template_params = [
      {
        type: 'body',
        parameters: input.bodyParams.map((text) => ({ type: 'text', text })),
      },
    ];
  }
  return body;
}

export function mapLiveSummary(row: unknown): LiveSummary | null {
  if (!row || typeof row !== 'object') return null;
  const item = row as { conversation_id?: unknown; start_time_unix_secs?: unknown; transcript_summary?: unknown; call_summary_title?: unknown };
  if (typeof item.conversation_id !== 'string' || !isLiveConversationId(item.conversation_id)) return null;
  const started = typeof item.start_time_unix_secs === 'number' ? new Date(item.start_time_unix_secs * 1000).toISOString() : null;
  const raw = typeof item.transcript_summary === 'string' && item.transcript_summary.trim()
    ? item.transcript_summary
    : typeof item.call_summary_title === 'string'
      ? item.call_summary_title
      : '';
  return { conversationId: item.conversation_id, startedAt: started, preview: raw.slice(0, 280) };
}

export function mapLiveDetail(json: unknown): LiveDetail | null {
  if (!json || typeof json !== 'object') return null;
  const row = json as {
    conversation_id?: unknown;
    metadata?: { start_time_unix_secs?: unknown; whatsapp?: { whatsapp_user_id?: unknown; whatsapp_phone_number_id?: unknown } };
    transcript?: unknown;
  };
  if (typeof row.conversation_id !== 'string' || !isLiveConversationId(row.conversation_id)) return null;
  const started = typeof row.metadata?.start_time_unix_secs === 'number'
    ? new Date(row.metadata.start_time_unix_secs * 1000).toISOString()
    : null;
  const turns: LiveTurn[] = [];
  if (Array.isArray(row.transcript)) {
    for (const turn of row.transcript) {
      if (!turn || typeof turn !== 'object') continue;
      const item = turn as { role?: unknown; message?: unknown; time_in_call_secs?: unknown };
      if (typeof item.message !== 'string' || !item.message.trim()) continue;
      const role = item.role === 'user' ? 'customer' : item.role === 'agent' ? 'agent' : null;
      if (!role) continue;
      turns.push({
        role,
        text: item.message,
        atSeconds: typeof item.time_in_call_secs === 'number' ? item.time_in_call_secs : null,
      });
    }
  }
  const userId = row.metadata?.whatsapp?.whatsapp_user_id;
  const phoneId = row.metadata?.whatsapp?.whatsapp_phone_number_id;
  return {
    conversationId: row.conversation_id,
    startedAt: started,
    turns,
    phoneNumberId: typeof phoneId === 'string' ? phoneId : null,
    whatsappUserId: typeof userId === 'string' ? userId : null,
  };
}
