import { createHmac } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WhatsAppWebhookController } from './whatsapp.webhook.controller';
import type { WhatsAppService } from './whatsapp.service';

const SECRET = 'test-app-secret';

function sign(raw: Buffer, secret = SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
}

function req(raw: Buffer) {
  return { rawBody: raw } as never;
}

describe('WhatsAppWebhookController (EC-17 signature)', () => {
  let whatsapp: {
    verifyWebhookSignature: ReturnType<typeof vi.fn>;
    ingestWebhookPayload: ReturnType<typeof vi.fn>;
    handleInboundAfterPersist: ReturnType<typeof vi.fn>;
  };
  let controller: WhatsAppWebhookController;

  beforeEach(() => {
    whatsapp = {
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      ingestWebhookPayload: vi.fn().mockResolvedValue([]),
      handleInboundAfterPersist: vi.fn().mockResolvedValue(undefined),
    };
  });

  const hub = { connectionStatus: vi.fn() };

  it('rejects when APP_SECRET is empty (fail closed)', async () => {
    controller = new WhatsAppWebhookController(
      whatsapp as unknown as WhatsAppService,
      hub as never,
      { WHATSAPP_APP_SECRET: '', WHATSAPP_VERIFY_TOKEN: 'v' } as never,
    );
    const raw = Buffer.from('{}');
    await expect(controller.receive(req(raw), sign(raw))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(whatsapp.ingestWebhookPayload).not.toHaveBeenCalled();
  });

  it('rejects invalid signature with 403 and does not ingest', async () => {
    whatsapp.verifyWebhookSignature.mockReturnValue(false);
    controller = new WhatsAppWebhookController(
      whatsapp as unknown as WhatsAppService,
      hub as never,
      { WHATSAPP_APP_SECRET: SECRET, WHATSAPP_VERIFY_TOKEN: 'v' } as never,
    );
    const raw = Buffer.from('{"object":"whatsapp_business_account"}');
    await expect(controller.receive(req(raw), 'sha256=deadbeef')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(whatsapp.ingestWebhookPayload).not.toHaveBeenCalled();
  });

  it('rejects missing raw body', async () => {
    controller = new WhatsAppWebhookController(
      whatsapp as unknown as WhatsAppService,
      hub as never,
      { WHATSAPP_APP_SECRET: SECRET, WHATSAPP_VERIFY_TOKEN: 'v' } as never,
    );
    await expect(
      controller.receive({ rawBody: undefined } as never, sign(Buffer.from('x'))),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts valid signature and returns 200', async () => {
    controller = new WhatsAppWebhookController(
      whatsapp as unknown as WhatsAppService,
      hub as never,
      { WHATSAPP_APP_SECRET: SECRET, WHATSAPP_VERIFY_TOKEN: 'v' } as never,
    );
    const raw = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');
    const res = await controller.receive(req(raw), sign(raw));
    expect(res).toEqual({ received: true });
    expect(whatsapp.ingestWebhookPayload).toHaveBeenCalledOnce();
  });

  it('schedules after-persist for new ids without awaiting', async () => {
    whatsapp.ingestWebhookPayload.mockResolvedValue(['id-1']);
    controller = new WhatsAppWebhookController(
      whatsapp as unknown as WhatsAppService,
      hub as never,
      { WHATSAPP_APP_SECRET: SECRET, WHATSAPP_VERIFY_TOKEN: 'v' } as never,
    );
    const raw = Buffer.from('{"entry":[]}');
    await controller.receive(req(raw), sign(raw));
    await Promise.resolve();
    expect(whatsapp.handleInboundAfterPersist).toHaveBeenCalledWith(['id-1']);
  });
});
