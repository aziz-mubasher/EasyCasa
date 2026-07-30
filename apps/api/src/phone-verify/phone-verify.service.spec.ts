import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PhoneVerifyService } from './phone-verify.service';

function cfg() {
  return {
    PHONE_OTP_PEPPER: 'test-phone-otp-pepper-xx',
  };
}

describe('PhoneVerifyService (Phase B OTP consumer)', () => {
  const insertValues = vi.fn();
  const updateSet = vi.fn();
  const db = {
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet.mockReturnValue({ where: vi.fn() }) })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    })),
  };

  const whatsapp = {
    sendAuthenticationOtp: vi.fn(),
  };
  const email = {
    sendText: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    insertValues.mockResolvedValue(undefined);
    updateSet.mockReturnValue({ where: vi.fn() });
  });

  it('stores whatsapp channel + wamid when Cloud send succeeds', async () => {
    whatsapp.sendAuthenticationOtp.mockResolvedValue({ ok: true, messageId: 'wamid.abc' });
    const svc = new PhoneVerifyService(db as never, cfg() as never, whatsapp as never, email as never);

    const res = await svc.start('user-1', '+39 333 111 2233', { email: 'a@b.it' });

    expect(res.channel).toBe('whatsapp');
    expect(whatsapp.sendAuthenticationOtp).toHaveBeenCalled();
    expect(email.sendText).not.toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'whatsapp',
        providerMessageId: 'wamid.abc',
        fallbackReason: null,
        phoneE164: '+393331112233',
      }),
    );
  });

  it('falls back to email and records fallback_reason when WhatsApp fails', async () => {
    whatsapp.sendAuthenticationOtp.mockResolvedValue({
      ok: false,
      reason: 'not_configured',
    });
    const svc = new PhoneVerifyService(db as never, cfg() as never, whatsapp as never, email as never);

    const res = await svc.start('user-1', '+393331112233', { email: 'a@b.it' });

    expect(res.channel).toBe('email');
    expect(email.sendText).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'email',
        providerMessageId: null,
        fallbackReason: 'not_configured',
      }),
    );
  });

  it('errors when WhatsApp fails and account has no email', async () => {
    whatsapp.sendAuthenticationOtp.mockResolvedValue({ ok: false, reason: 'api_error', message: 'x' });
    const svc = new PhoneVerifyService(db as never, cfg() as never, whatsapp as never, email as never);

    await expect(svc.start('user-1', '+393331112233', { email: null })).rejects.toThrow(
      /no email/i,
    );
  });
});
