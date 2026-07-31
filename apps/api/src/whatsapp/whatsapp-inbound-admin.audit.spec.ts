import { InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WhatsAppInboundAdminService } from './whatsapp-inbound-admin.service';

describe('WhatsAppInboundAdminService.listMessagesForWaId audit fail-closed', () => {
  const now = new Date('2026-07-31T12:00:00.000Z');

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
            limit: vi.fn().mockResolvedValue([{ id: 'm1' }]),
          }),
        }),
      }),
    };
    const audit = {
      record: vi.fn().mockRejectedValue(new Error('insert failed')),
    };
    const svc = new WhatsAppInboundAdminService(db as never, audit as never);
    await expect(
      svc.listMessagesForWaId('393331112233', 'actor-1', {}, now),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(audit.record).toHaveBeenCalledOnce();
  });
});
