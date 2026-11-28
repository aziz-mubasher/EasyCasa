import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { WhatsAppLiveInboxService, archiveSendsOnLiveNumber } from './whatsapp-live-inbox.service';

function service(overrides?: { key?: string; fetchImpl?: typeof fetch }) {
  const cloud = { templateLanguageStatuses: vi.fn().mockResolvedValue(null) };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const config = {
    ELEVENLABS_API_KEY: overrides?.key ?? 'test-key',
    ELEVENLABS_API_BASE_URL: 'https://api.elevenlabs.io',
    WHATSAPP_LIVE_PHONE_NUMBER_ID: '1448737268325965',
    WHATSAPP_LIVE_AGENT_ID: 'agent_4101m7mysnsyfv7v1bwh9gjp0r7b',
    WHATSAPP_PHONE_NUMBER_ID: '999',
  };
  return {
    cloud,
    audit,
    svc: new WhatsAppLiveInboxService(config as never, audit as never, cloud as never),
  };
}

describe('archiveSendsOnLiveNumber', () => {
  it('is true only when both ids match', () => {
    expect(archiveSendsOnLiveNumber('1448737268325965', '1448737268325965')).toBe(true);
    expect(archiveSendsOnLiveNumber('999', '1448737268325965')).toBe(false);
    expect(archiveSendsOnLiveNumber('', '1448737268325965')).toBe(false);
  });
});

describe('WhatsAppLiveInboxService', () => {
  it('refuses to list when the key is empty', async () => {
    const { svc } = service({ key: '' });
    await expect(svc.list()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('lists only conversation ids and redacts phones in the preview', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        conversations: [
          {
            conversation_id: 'conv_abc12345',
            start_time_unix_secs: 1_700_000_000,
            transcript_summary: 'Called +39 379 330 6605 about a flat',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchImpl);
    const { svc } = service();
    const result = await svc.list();
    expect(result.items[0]?.conversationId).toBe('conv_abc12345');
    expect(result.items[0]?.preview).toContain('[phone]');
    expect(JSON.stringify(result)).not.toContain('3793306605');
    vi.unstubAllGlobals();
  });

  it('refuses a conversation that belongs to another WhatsApp number', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        conversation_id: 'conv_abc12345',
        metadata: { whatsapp: { whatsapp_phone_number_id: '1126498893889337', whatsapp_user_id: '393000000000' } },
        transcript: [],
      }),
    }));
    const { svc } = service();
    await expect(svc.detail('conv_abc12345', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    vi.unstubAllGlobals();
  });

  it('sends the follow-up template without returning the recipient id', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversation_id: 'conv_abc12345',
          metadata: {
            whatsapp: { whatsapp_phone_number_id: '1448737268325965', whatsapp_user_id: '393001112233' },
          },
          transcript: [{ role: 'user', message: 'Cerco casa', time_in_call_secs: 1 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conversation_id: 'conv_outbound1' }),
      });
    vi.stubGlobal('fetch', fetchImpl);
    const { svc, audit } = service();
    const sent = await svc.sendFollowUp('conv_abc12345', 'user-1', {
      staffName: 'Giulia',
      subject: 'visita',
      locale: 'it',
    });
    expect(sent.templateName).toBe('ec_request_followup');
    expect(sent.providerConversationId).toBe('conv_outbound1');
    const body = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body));
    expect(body.template_name).toBe('ec_request_followup');
    expect(body.whatsapp_user_id).toBe('393001112233');
    expect(JSON.stringify(sent)).not.toContain('393001112233');
    expect(audit.record).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('sends the call-permission template with no body parameters', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversation_id: 'conv_abc12345',
          metadata: {
            whatsapp: { whatsapp_phone_number_id: '1448737268325965', whatsapp_user_id: '393001112233' },
          },
          transcript: [],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ conversation_id: 'conv_perm1' }) });
    vi.stubGlobal('fetch', fetchImpl);
    const { svc } = service();
    const sent = await svc.sendCallPermission('conv_abc12345', 'user-1', { locale: 'it' });
    expect(sent.templateName).toBe('ec_callback_permission');
    const body = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body));
    expect(body.template_name).toBe('ec_callback_permission');
    expect(body.template_language_code).toBe('it');
    expect(body.template_params).toBeUndefined();
    expect(body.whatsapp_user_id).toBe('393001112233');
    expect(JSON.stringify(sent)).not.toContain('393001112233');
    vi.unstubAllGlobals();
  });

  it('refuses a language Meta has not approved when a status list exists', async () => {
    const { svc, cloud } = service();
    cloud.templateLanguageStatuses.mockResolvedValue([{ language: 'en', status: 'APPROVED' }]);
    await expect(svc.sendFollowUp('conv_abc12345', 'user-1', {
      staffName: 'Giulia',
      subject: 'visita',
      locale: 'it',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
