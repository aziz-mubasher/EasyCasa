import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { WhatsAppInboundAdminService } from './whatsapp-inbound-admin.service';
import { waHandleFor } from './wa-handle';

const SECRET = 'test-wa-handle-secret-xx';

function chain(result: unknown) {
  const self: Record<string, unknown> = {};
  self.from = vi.fn(() => self);
  self.where = vi.fn(() => self);
  self.orderBy = vi.fn(() => self);
  self.limit = vi.fn(async () => result);
  self.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return self;
}

describe('WhatsAppInboundAdminService listMessagesForHandle', () => {
  const now = new Date('2026-07-31T12:00:00.000Z');
  const waId = '393331112233';
  const handle = waHandleFor(waId, SECRET);

  it('throws and does not return bodies when audit.record fails', async () => {
    const inboundRows = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        providerMessageId: 'wamid.1',
        phoneNumberId: 'pnid',
        messageType: 'text',
        body: 'secret body',
        contactName: null,
        receivedAt: now,
        windowExpiresAt: new Date(now.getTime() + 3600_000),
        autoRepliedAt: null,
        forwardedAt: null,
        forwardError: null,
        createdAt: now,
      },
    ];
    const select = vi
      .fn()
      .mockReturnValueOnce(chain([{ waId }])) // resolveHandle
      .mockReturnValueOnce(chain(inboundRows)) // inbound page
      .mockReturnValueOnce(chain([])) // outbound
      .mockReturnValueOnce(
        chain([{ windowExpiresAt: inboundRows[0]!.windowExpiresAt, contactName: null }]),
      ); // window

    const db = { select, execute: vi.fn() };
    const audit = {
      record: vi.fn().mockRejectedValue(new Error('insert failed')),
    };
    const cloud = { sendText: vi.fn() };
    const svc = new WhatsAppInboundAdminService(
      db as never,
      audit as never,
      cloud as never,
      { WA_HANDLE_SECRET: SECRET } as never,
    );
    await expect(
      svc.listMessagesForHandle(handle, 'actor-1', {}, now),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(audit.record).toHaveBeenCalledOnce();
  });

  it('unknown handle → 404 without audit', async () => {
    const db = {
      select: vi.fn().mockReturnValue(chain([])),
      execute: vi.fn().mockResolvedValue([{ wa_id: waId }]),
    };
    const audit = { record: vi.fn() };
    const cloud = { sendText: vi.fn() };
    const svc = new WhatsAppInboundAdminService(
      db as never,
      audit as never,
      cloud as never,
      { WA_HANDLE_SECRET: SECRET } as never,
    );
    await expect(
      svc.listMessagesForHandle('deadbeefdeadbeefdeadbeefdeadbeef', 'actor-1', {}, now),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.record).not.toHaveBeenCalled();
  });
});
