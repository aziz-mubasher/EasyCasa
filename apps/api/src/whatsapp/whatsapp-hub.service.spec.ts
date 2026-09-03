import { describe, expect, it, vi } from 'vitest';

import { WhatsAppHubService } from './whatsapp-hub.service';

describe('WhatsAppHubService.templatesCatalog', () => {
  it('lists auth + utility names without secrets', () => {
    const hub = new WhatsAppHubService(
      { select: vi.fn() } as never,
      { configured: true } as never,
      { measurementSummary: vi.fn() } as never,
      {
        WHATSAPP_OTP_TEMPLATE: 'easycasa_otp',
        WHATSAPP_OTP_TEMPLATE_LANG: 'it',
        WHATSAPP_VIEWING_REMINDER_24H_TEMPLATE: 'easycasa_viewing_reminder_24h',
        WHATSAPP_VIEWING_REMINDER_2H_TEMPLATE: '',
        WHATSAPP_VIEWING_REQUESTED_TEMPLATE: 'easycasa_viewing_requested',
        WHATSAPP_VIEWING_CONFIRMED_TEMPLATE: '',
        WHATSAPP_VIEWING_CANCELLED_TEMPLATE: '',
        WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE: '',
      } as never,
    );
    const catalog = hub.templatesCatalog();
    expect(catalog.marketingTemplates).toBe(false);
    expect(catalog.items.find((i) => i.key === 'otp')?.kind).toBe('authentication');
    expect(catalog.items.find((i) => i.key === 'viewing_reminder_24h')?.configured).toBe(true);
    expect(catalog.items.find((i) => i.key === 'viewing_reminder_2h')?.configured).toBe(false);
    expect(JSON.stringify(catalog)).not.toMatch(/WHATSAPP_TOKEN|app-secret|sk_/);
  });
});
