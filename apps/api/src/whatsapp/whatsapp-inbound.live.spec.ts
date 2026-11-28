import { describe, expect, it, vi } from 'vitest';

import { WhatsAppInboundService } from './whatsapp-inbound.service';

const LIVE = '1448737268325965';

describe('WhatsAppInboundService live number', () => {
  it('stores the message for the desk and does not auto-reply', async () => {
    const row = {
      id: 'row-1',
      waId: '393331112233',
      phoneNumberId: LIVE,
      messageType: 'text',
      body: 'ciao',
      receivedAt: new Date('2026-11-28T12:00:00.000Z'),
      windowExpiresAt: new Date('2026-11-29T12:00:00.000Z'),
    };
    const selectChain = {
      from: () => selectChain,
      where: () => selectChain,
      limit: async () => [row],
    };
    const updateChain = {
      set: () => updateChain,
      where: async () => undefined,
    };
    const db = {
      select: () => selectChain,
      update: () => updateChain,
    };
    const journey = { recordInboundLead: vi.fn(), handleInboundRow: vi.fn() };
    const intake = { handleInboundRow: vi.fn() };
    const email = { sendText: vi.fn().mockResolvedValue({ delivered: true, provider: 'smtp' }) };
    const svc = new WhatsAppInboundService(
      db as never,
      email as never,
      {
        WHATSAPP_LIVE_PHONE_NUMBER_ID: LIVE,
        WHATSAPP_INBOUND_OPS_EMAIL: 'ops@example.com',
        AGENCY_PUBLIC_EMAIL: 'ops@example.com',
        ADMIN_PUBLIC_URL: 'https://admin.example',
        WA_INBOUND_EMAIL_FORWARD: false,
        WA_INTAKE_ENABLED: true,
      } as never,
      journey as never,
      intake as never,
    );

    await svc.handleAfterPersist(['row-1']);

    expect(journey.recordInboundLead).toHaveBeenCalledWith('row-1');
    expect(journey.handleInboundRow).not.toHaveBeenCalled();
    expect(intake.handleInboundRow).not.toHaveBeenCalled();
    expect(email.sendText).toHaveBeenCalled();
  });
});
