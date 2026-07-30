import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WhatsAppCloudClient } from './whatsapp-cloud.client';
import { WhatsAppService } from './whatsapp.service';

function cfg(overrides: Record<string, unknown> = {}) {
  return {
    DEMO_MODE: false,
    WHATSAPP_TOKEN: 'tok',
    WHATSAPP_PHONE_NUMBER_ID: 'pnid',
    WHATSAPP_OTP_TEMPLATE: 'easycasa_phone_verify',
    WHATSAPP_OTP_TEMPLATE_LANG: 'it',
    WHATSAPP_GRAPH_VERSION: 'v21.0',
    WHATSAPP_APP_SECRET: 'app-secret',
    WHATSAPP_VERIFY_TOKEN: 'verify-me',
    ...overrides,
  };
}

describe('WhatsAppService / CloudClient (Phase A)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('configured is false in DEMO_MODE', () => {
    const cloud = new WhatsAppCloudClient(cfg({ DEMO_MODE: true }) as never);
    expect(cloud.configured).toBe(false);
  });

  it('sendAuthenticationOtp posts auth template with body + button params', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.1' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const cloud = new WhatsAppCloudClient(cfg() as never);
    const res = await cloud.sendAuthenticationOtp('+393331112233', '123456');
    expect(res).toEqual({ ok: true, messageId: 'wamid.1' });
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1].body));
    expect(body.template.name).toBe('easycasa_phone_verify');
    expect(body.template.components).toHaveLength(2);
  });

  it('verifySignature accepts valid X-Hub-Signature-256', () => {
    const cloud = new WhatsAppCloudClient(cfg() as never);
    const raw = Buffer.from('{"object":"whatsapp_business_account"}');
    const hex = createHmac('sha256', 'app-secret').update(raw).digest('hex');
    expect(cloud.verifySignature(raw, `sha256=${hex}`)).toBe(true);
    expect(cloud.verifySignature(raw, 'sha256=deadbeef')).toBe(false);
  });

  it('ingestStatusPayload logs statuses without throwing', () => {
    const cloud = new WhatsAppCloudClient(cfg() as never);
    const svc = new WhatsAppService(cloud);
    expect(() =>
      svc.ingestStatusPayload({
        entry: [{ changes: [{ value: { statuses: [{ id: 'm1', status: 'delivered' }] } }] }],
      }),
    ).not.toThrow();
  });

  it('sendTemplate rejects empty template name as not_configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const cloud = new WhatsAppCloudClient(cfg() as never);
    const res = await cloud.sendTemplate({
      phoneE164: '+393331112233',
      templateName: '  ',
      bodyParams: ['a'],
    });
    expect(res).toEqual({ ok: false, reason: 'not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sendTemplate posts utility body params', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.util' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const cloud = new WhatsAppCloudClient(cfg() as never);
    const res = await cloud.sendTemplate({
      phoneE164: '+393331112233',
      templateName: 'easycasa_viewing_reminder_24h',
      languageCode: 'it',
      bodyParams: ['Anna', 'Attico', 'Milano, MI', 'domani'],
    });
    expect(res).toEqual({ ok: true, messageId: 'wamid.util' });
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1].body));
    expect(body.template.name).toBe('easycasa_viewing_reminder_24h');
    expect(body.template.components[0].parameters).toHaveLength(4);
  });
});
