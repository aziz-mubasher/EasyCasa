export type ElevenLabsHistoryItem = {
  conversationId: string;
  startedAt: string | null;
  preview: string;
  readOnly: true;
};

export type WebhookInboxItem = {
  waId: string;
  preview: string;
  lastAt: string;
  source: 'webhook';
};

export function mergeInboxSources(
  mode: 'elevenlabs' | 'webhook',
  webhook: WebhookInboxItem[],
  elevenlabs: ElevenLabsHistoryItem[],
): { active: WebhookInboxItem[] | ElevenLabsHistoryItem[]; history: ElevenLabsHistoryItem[] } {
  if (mode === 'elevenlabs') {
    return { active: elevenlabs, history: [] };
  }
  return { active: webhook, history: elevenlabs };
}