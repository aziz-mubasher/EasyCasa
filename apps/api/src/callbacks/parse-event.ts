import {
  normalizeCallbackLanguage,
  type CallbackLanguage,
  type CallbackRole,
  type CallbackTopic,
} from '@easycasa/shared';

export type ParsedVoiceCall = {
  conversationId: string;
  calledNumber: string | null;
  callerNumber: string | null;
  callerName: string;
  callbackPhone: string | null;
  callbackRequested: boolean;
  preferredCallbackTime: string;
  language: CallbackLanguage;
  topic: CallbackTopic;
  callerRole: CallbackRole;
  summary: string;
  title: string;
  durationSecs: number;
  evaluations: {
    ai_disclosed: string;
    no_mediation: string;
    no_credit_no_amounts: string;
    callback_captured: string;
  };
};

export type ParseResult =
  | { kind: 'call'; call: ParsedVoiceCall }
  | { kind: 'ignore'; reason: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function collected(data: Record<string, unknown>, key: string): string {
  const analysis = asRecord(data.analysis);
  const bag = asRecord(analysis?.data_collection_results);
  const row = asRecord(bag?.[key]);
  const value = row?.value ?? bag?.[key];
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function evaluation(data: Record<string, unknown>, key: string): string {
  const analysis = asRecord(data.analysis);
  const bag = asRecord(analysis?.evaluation_criteria_results);
  const row = asRecord(bag?.[key]);
  const value = row?.result ?? row?.value ?? '';
  return typeof value === 'string' ? value : '';
}

function digitsE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return `+${digits}`;
}

function topicOf(raw: string): CallbackTopic {
  const v = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (v.includes('legenda') || v === 'auction' || v === 'asta') return 'EasyLegenda';
  if (v === 'other' || v === 'altro') return 'Other';
  if (v.includes('casa') || v === 'easycasa') return 'EasyCasa';
  return 'Other';
}

function roleOf(raw: string): CallbackRole {
  const v = raw.trim().toLowerCase();
  if (v.startsWith('sell') || v === 'venditore' || v === 'vendor') return 'seller';
  if (v.startsWith('auction') || v.startsWith('asta') || v.includes('legenda')) return 'auction';
  if (v.startsWith('info') || v === 'other' || v === 'altro') return 'info';
  if (v.startsWith('buy') || v === 'acquirente' || v === 'compratore') return 'buyer';
  return 'info';
}

function truthy(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === 'true' || v === 'yes' || v === 'si' || v === 'sì' || v === '1';
}

function callerFrom(data: Record<string, unknown>): string | null {
  const meta = asRecord(data.metadata);
  const phone = asRecord(meta?.phone_call);
  const external = typeof phone?.external_number === 'string' ? phone.external_number : '';
  const init = asRecord(data.conversation_initiation_client_data);
  const dyn = asRecord(init?.dynamic_variables);
  const system = typeof dyn?.system__caller_id === 'string' ? dyn.system__caller_id : '';
  return digitsE164(external) ?? digitsE164(system);
}

function calledFrom(data: Record<string, unknown>): string | null {
  const meta = asRecord(data.metadata);
  const phone = asRecord(meta?.phone_call);
  const agent = typeof phone?.agent_number === 'string' ? phone.agent_number : '';
  const dyn = asRecord(asRecord(data.conversation_initiation_client_data)?.dynamic_variables);
  const to = typeof dyn?.system__called_number === 'string' ? dyn.system__called_number : '';
  return digitsE164(agent) ?? digitsE164(to);
}

/**
 * Read a post-call transcription webhook.
 * The transcript array and any audio payload are dropped here and never returned.
 */
export function parseVoiceEvent(body: unknown): ParseResult {
  const root = asRecord(body);
  if (!root) return { kind: 'ignore', reason: 'not-json' };
  const type = typeof root.type === 'string' ? root.type : '';
  if (type === 'post_call_audio') return { kind: 'ignore', reason: 'audio-not-stored' };
  if (type !== 'post_call_transcription') return { kind: 'ignore', reason: `type:${type || 'missing'}` };
  const data = asRecord(root.data);
  if (!data) return { kind: 'ignore', reason: 'no-data' };
  const conversationId = typeof data.conversation_id === 'string' ? data.conversation_id.trim() : '';
  if (!conversationId) return { kind: 'ignore', reason: 'no-conversation' };
  const analysis = asRecord(data.analysis);
  const meta = asRecord(data.metadata);
  const duration = typeof meta?.call_duration_secs === 'number' ? meta.call_duration_secs : 0;
  const summary = typeof analysis?.transcript_summary === 'string' ? analysis.transcript_summary : '';
  const title = typeof analysis?.call_summary_title === 'string' ? analysis.call_summary_title : '';
  const callbackPhone = digitsE164(collected(data, 'callback_phone'));
  return {
    kind: 'call',
    call: {
      conversationId,
      calledNumber: calledFrom(data),
      callerNumber: callerFrom(data),
      callerName: collected(data, 'caller_name'),
      callbackPhone,
      callbackRequested: truthy(collected(data, 'callback_requested')),
      preferredCallbackTime: collected(data, 'preferred_callback_time'),
      language: normalizeCallbackLanguage(collected(data, 'language')),
      topic: topicOf(collected(data, 'topic')),
      callerRole: roleOf(collected(data, 'caller_role')),
      summary,
      title,
      durationSecs: duration,
      evaluations: {
        ai_disclosed: evaluation(data, 'ai_disclosed'),
        no_mediation: evaluation(data, 'no_mediation'),
        no_credit_no_amounts: evaluation(data, 'no_credit_no_amounts'),
        callback_captured: evaluation(data, 'callback_captured'),
      },
    },
  };
}
