import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WhatsAppInboundAdminService } from './whatsapp-inbound-admin.service';
import { waHandleFor } from './wa-handle';

const SECRET = 'test-wa-handle-secret-xx';

describe('WhatsAppInboundAdminService listMessagesForHandle', () => {
  const now = new Date('2026-07-31T12:00:00.000Z');
  const waId = '393331112233';
  const handle = waHandleFor(waId, SECRET);

  it('throws and does not return bodies when audit.record fails', async () => {
    const rows = [
      {
        id: 'm1',
        messageType: 'text',
        body: 'secret body',
        receivedAt: now,
        windowExpiresAt: new Date(now.getTime() + 3600_000),
        autoRepliedAt: null,
      },
    ];
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(rows),
            }),
            limit: vi.fn().mockResolvedValue([{ waId }]),
          }),
        }),
      }),
      selectDistinct: vi.fn(),
    };
    const audit = {
      record: vi.fn().mockRejectedValue(new Error('insert failed')),
    };
    const svc = new WhatsAppInboundAdminService(
      db as never,
      audit as never,
      { WA_HANDLE_SECRET: SECRET } as never,
    );
    await expect(
      svc.listMessagesForHandle(handle, 'actor-1', {}, now),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(audit.record).toHaveBeenCalledOnce();
  });

  it('unknown handle → 404 without audit', async () => {
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      execute: vi.fn().mockResolvedValue([{ wa_id: waId }]),
    };
    const audit = { record: vi.fn() };
    const svc = new WhatsAppInboundAdminService(
      db as never,
      audit as never,
      { WA_HANDLE_SECRET: SECRET } as never,
    );
    await expect(
      svc.listMessagesForHandle('deadbeefdeadbeefdeadbeefdeadbeef', 'actor-1', {}, now),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.record).not.toHaveBeenCalled();
  });
});
