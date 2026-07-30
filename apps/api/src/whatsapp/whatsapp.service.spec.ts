import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WhatsAppCloudClient } from './whatsapp-cloud.client';
import {
  AUTO_REPLY_TEXT,
  extractInboundMessages,
  isStopWord,
  WhatsAppInboundService,
} from './whatsapp-inbound.service';
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
    WHATSAPP_INBOUND_OPS_EMAIL: 'ops@easycasaita.com',
    AGENCY_PUBLIC_EMAIL: 'info@easycasaita.com',
    WA_INBOUND_EMAIL_FORWARD: false,
    ADMIN_PUBLIC_URL: 'https://admin.easycasaita.com',
    WA_HANDLE_SECRET: 'test-wa-handle-secret-xx',
    ...overrides,
  };
}

function messagePayload(overrides: {
  id?: string;
  from?: string;
  type?: string;
  body?: string;
  timestamp?: string;
  withStatus?: boolean;
} = {}) {
  const msg: Record<string, unknown> = {
    id: overrides.id ?? 'wamid.1',
    from: overrides.from ?? '393331112233',
    timestamp: overrides.timestamp ?? String(Math.floor(Date.now() / 1000)),
    type: overrides.type ?? 'text',
  };
  if ((overrides.type ?? 'text') === 'text') {
    msg.text = { body: overrides.body ?? 'Ciao' };
  }
  const value: Record<string, unknown> = {
    metadata: { phone_number_id: 'pnid' },
    messages: [msg],
  };
  if (overrides.withStatus) {
    value.statuses = [{ id: 'wamid.out', status: 'delivered' }];
  }
  return { object: 'whatsapp_business_account', entry: [{ changes: [{ value }] }] };
}

describe('WhatsApp inbound helpers', () => {
  it('extractInboundMessages parses text and leaves media body null', () => {
    const text = extractInboundMessages(messagePayload({ body: 'hello' }));
    expect(text).toHaveLength(1);
    expect(text[0]!.body).toBe('hello');
    expect(text[0]!.messageType).toBe('text');

    const media = extractInboundMessages(messagePayload({ type: 'image', id: 'wamid.img' }));
    expect(media[0]!.messageType).toBe('image');
    expect(media[0]!.body).toBeNull();
  });

  it('isStopWord matches whole-message tokens only', () => {
    expect(isStopWord('STOP')).toBe(true);
    expect(isStopWord(' basta ')).toBe(true);
    expect(isStopWord('please STOP later')).toBe(false);
  });
});

describe('WhatsAppService / CloudClient (Phase A + EC-16 + EC-17)', () => {
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
    expect(cloud.verifySignature(raw, undefined)).toBe(false);
  });

  it('verifySignature rejects empty secret', () => {
    const cloud = new WhatsAppCloudClient(cfg({ WHATSAPP_APP_SECRET: '' }) as never);
    const raw = Buffer.from('{}');
    expect(cloud.verifySignature(raw, 'sha256=abc')).toBe(false);
  });

  it('ingestStatusPayload updates store by provider id', async () => {
    const cloud = new WhatsAppCloudClient(cfg() as never);
    const inbound = {
      persistNewMessages: vi.fn(),
      handleAfterPersist: vi.fn(),
    };
    const store = {
      recordSendAttempt: vi.fn().mockResolvedValue(undefined),
      applyStatusUpdate: vi.fn().mockResolvedValue(undefined),
    };
    const svc = new WhatsAppService(cloud, inbound as never, store as never, cfg() as never);
    await svc.ingestStatusPayload({
      entry: [{ changes: [{ value: { statuses: [{ id: 'm1', status: 'delivered' }] } }] }],
    });
    expect(store.applyStatusUpdate).toHaveBeenCalledWith('m1', 'delivered', undefined);
  });

  it('sendAuthenticationOtp records send via messages store', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.1' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const cloud = new WhatsAppCloudClient(cfg() as never);
    const inbound = { persistNewMessages: vi.fn(), handleAfterPersist: vi.fn() };
    const store = {
      recordSendAttempt: vi.fn().mockResolvedValue(undefined),
      applyStatusUpdate: vi.fn().mockResolvedValue(undefined),
    };
    const svc = new WhatsAppService(cloud, inbound as never, store as never, cfg() as never);
    const res = await svc.sendAuthenticationOtp('+393331112233', '123456', {
      toUserId: 'u1',
      relatedType: 'otp',
    });
    expect(res).toEqual({ ok: true, messageId: 'wamid.1' });
    expect(store.recordSendAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        templateName: 'easycasa_phone_verify',
        result: { ok: true, messageId: 'wamid.1' },
      }),
    );
  });

  it('sendTemplate via service persists and skips persist on not_configured', async () => {
    const cloud = new WhatsAppCloudClient(cfg() as never);
    const inbound = { persistNewMessages: vi.fn(), handleAfterPersist: vi.fn() };
    const store = {
      recordSendAttempt: vi.fn().mockResolvedValue(undefined),
      applyStatusUpdate: vi.fn().mockResolvedValue(undefined),
    };
    const svc = new WhatsAppService(cloud, inbound as never, store as never, cfg() as never);
    const empty = await svc.sendTemplate({
      phoneE164: '+393331112233',
      templateName: '  ',
      bodyParams: ['a'],
    });
    expect(empty).toEqual({ ok: false, reason: 'not_configured' });
    expect(store.recordSendAttempt).not.toHaveBeenCalled();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.util' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = await svc.sendTemplate({
      phoneE164: '+393331112233',
      templateName: 'easycasa_viewing_reminder_24h',
      languageCode: 'it',
      bodyParams: ['Anna', 'Attico', 'Milano, MI', 'domani'],
      meta: { toUserId: 'u1', relatedType: 'viewing', relatedId: 'v1' },
    });
    expect(res).toEqual({ ok: true, messageId: 'wamid.util' });
    expect(store.recordSendAttempt).toHaveBeenCalled();
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

  it('sendText posts free-form body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.txt' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const cloud = new WhatsAppCloudClient(cfg() as never);
    const res = await cloud.sendText('+393331112233', AUTO_REPLY_TEXT);
    expect(res).toEqual({ ok: true, messageId: 'wamid.txt' });
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1].body));
    expect(body.type).toBe('text');
    expect(body.text.body).toContain('Abbiamo ricevuto');
  });
});

describe('WhatsAppInboundService process rules', () => {
  it('skips auto-reply for stop words and still attempts ops forward', async () => {
    const row = {
      id: 'row-1',
      providerMessageId: 'wamid.1',
      waId: '393331112233',
      phoneNumberId: 'pnid',
      messageType: 'text',
      body: 'STOP',
      receivedAt: new Date(),
      windowExpiresAt: new Date(Date.now() + 3600_000),
      autoRepliedAt: null,
      forwardedAt: null,
      forwardError: null,
      createdAt: new Date(),
    };

    const updates: unknown[] = [];
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([row]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((set) => {
          updates.push(set);
          return {
            where: vi.fn().mockResolvedValue([]),
          };
        }),
      }),
    };

    const cloud = {
      sendText: vi.fn(),
    };
    const email = {
      sendText: vi.fn().mockResolvedValue({ provider: 'smtp', delivered: true }),
    };

    const svc = new WhatsAppInboundService(
      db as never,
      cloud as never,
      email as never,
      cfg() as never,
    );
    await svc.handleAfterPersist(['row-1']);
    expect(cloud.sendText).not.toHaveBeenCalled();
    expect(email.sendText).toHaveBeenCalledOnce();
    const [, subject, text] = email.sendText.mock.calls[0] as [string, string, string];
    expect(subject).toBe('1 new inbound WhatsApp message');
    expect(text).not.toContain('STOP');
    expect(text).not.toContain('wa_id');
    expect(text).toContain('admin.easycasaita.com');
    expect(updates.some((u) => u && typeof u === 'object' && 'forwardedAt' in u)).toBe(true);
  });

  it('WA_INBOUND_EMAIL_FORWARD=true includes message body in ops email', async () => {
    const row = {
      id: 'row-fwd',
      providerMessageId: 'wamid.fwd',
      waId: '393331112233',
      phoneNumberId: 'pnid',
      messageType: 'text',
      body: 'Secret seeker text',
      receivedAt: new Date(),
      windowExpiresAt: new Date(Date.now() + 3600_000),
      autoRepliedAt: new Date(),
      forwardedAt: null,
      forwardError: null,
      createdAt: new Date(),
    };
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([row]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      }),
    };
    const email = {
      sendText: vi.fn().mockResolvedValue({ provider: 'smtp', delivered: true }),
    };
    const svc = new WhatsAppInboundService(
      db as never,
      { sendText: vi.fn() } as never,
      email as never,
      cfg({ WA_INBOUND_EMAIL_FORWARD: true }) as never,
    );
    await svc.handleAfterPersist(['row-fwd']);
    const [, , text] = email.sendText.mock.calls[0] as [string, string, string];
    expect(text).toContain('Secret seeker text');
    expect(text).toContain('wa_id:');
  });

  it('records forward_error when mail fails without throwing', async () => {
    const row = {
      id: 'row-2',
      providerMessageId: 'wamid.2',
      waId: '393331112233',
      phoneNumberId: 'pnid',
      messageType: 'text',
      body: 'Ciao',
      receivedAt: new Date(),
      windowExpiresAt: new Date(Date.now() + 3600_000),
      autoRepliedAt: new Date(), // already replied → skip send
      forwardedAt: null,
      forwardError: null,
      createdAt: new Date(),
    };

    const sets: Array<Record<string, unknown>> = [];
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([row]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockImplementation((set: Record<string, unknown>) => {
          sets.push(set);
          return { where: vi.fn().mockResolvedValue([]) };
        }),
      }),
    };

    const cloud = { sendText: vi.fn() };
    const email = {
      sendText: vi.fn().mockRejectedValue(new Error('smtp down')),
    };

    const svc = new WhatsAppInboundService(
      db as never,
      cloud as never,
      email as never,
      cfg() as never,
    );
    await expect(svc.handleAfterPersist(['row-2'])).resolves.toBeUndefined();
    expect(sets.some((s) => typeof s.forwardError === 'string')).toBe(true);
  });
});
