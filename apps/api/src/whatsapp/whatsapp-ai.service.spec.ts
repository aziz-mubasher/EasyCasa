import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { WhatsAppAiService } from './whatsapp-ai.service';

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

function makeSvc(opts: {
  configured?: boolean;
  complete?: ReturnType<typeof vi.fn>;
  resolveHandle?: ReturnType<typeof vi.fn>;
  inboundRows?: unknown[];
  outboundRows?: unknown[];
} = {}) {
  const complete =
    opts.complete ??
    vi.fn().mockResolvedValue({
      ok: true,
      text: '{"refused":false,"draft":"Ciao, indica città e fascia di prezzo.","reason":null}',
      model: 'claude-sonnet-4-5',
    });
  const select = vi
    .fn()
    .mockReturnValueOnce(chain(opts.inboundRows ?? []))
    .mockReturnValueOnce(chain(opts.outboundRows ?? []));
  const svc = new WhatsAppAiService(
    { configured: opts.configured ?? true, model: 'claude-sonnet-4-5', complete } as never,
    { resolveHandle: opts.resolveHandle ?? vi.fn().mockResolvedValue('393331112233') } as never,
    { record: vi.fn().mockResolvedValue({ id: 'aud-1' }) } as never,
    { select } as never,
  );
  return { svc, complete };
}

describe('WhatsAppAiService', () => {
  it('status never claims auto-send', () => {
    const { svc } = makeSvc();
    expect(svc.status()).toEqual({
      configured: true,
      model: 'claude-sonnet-4-5',
      autoSend: false,
      locales: ['it', 'en', 'es', 'fr', 'de', 'pt', 'ur', 'hi', 'pa', 'ar'],
    });
  });

  it('503 when Claude is not configured', async () => {
    const { svc } = makeSvc({ configured: false });
    await expect(
      svc.compose({ handle: 'abc', actorUserId: 'u1', prompt: 'Say hello' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('refuses a forbidden operator prompt without calling Claude', async () => {
    const { svc, complete } = makeSvc();
    const result = await svc.compose({
      handle: 'abc',
      actorUserId: 'u1',
      prompt: 'Write a proposta di acquisto for this listing',
      locale: 'it',
    });
    expect(result.refused).toBe(true);
    expect(result.draft).toBeNull();
    expect(result.reason).toMatch(/row 11/);
    expect(complete).not.toHaveBeenCalled();
  });

  it('returns a draft in the selected locale', async () => {
    const { svc, complete } = makeSvc();
    const result = await svc.compose({
      handle: 'abc',
      actorUserId: 'u1',
      prompt: 'Ask for city and price band',
      locale: 'it',
    });
    expect(result.refused).toBe(false);
    expect(result.draft).toContain('fascia di prezzo');
    expect(result.locale).toBe('it');
    expect(complete).toHaveBeenCalledOnce();
    const [, user] = complete.mock.calls[0] as [string, string];
    expect(user).toContain('Ask for city and price band');
  });

  it('blocks a draft that smuggles caparra', async () => {
    const { svc } = makeSvc({
      complete: vi.fn().mockResolvedValue({
        ok: true,
        text: '{"refused":false,"draft":"Invia la caparra sul conto.","reason":null}',
        model: 'claude-sonnet-4-5',
      }),
    });
    const result = await svc.compose({
      handle: 'abc',
      actorUserId: 'u1',
      prompt: 'Ask them to confirm next steps',
      locale: 'it',
    });
    expect(result.refused).toBe(true);
    expect(result.draft).toBeNull();
    expect(result.reason).toMatch(/caparra/);
  });

  it('translates inbound text to simple English', async () => {
    const { svc } = makeSvc({
      complete: vi.fn().mockResolvedValue({
        ok: true,
        text: '{"isEnglish":false,"detectedLanguage":"ur","translation":"Peace be upon you, I want a house in Brescia."}',
        model: 'claude-sonnet-4-5',
      }),
    });
    const result = await svc.translate({
      handle: 'abc',
      actorUserId: 'u1',
      text: 'السلام علیکم، بریشا میں گھر چاہیے',
    });
    expect(result.isEnglish).toBe(false);
    expect(result.detectedLanguage).toBe('ur');
    expect(result.translation).toContain('Brescia');
  });

  it('maps Claude transport failure to 502', async () => {
    const { svc } = makeSvc({
      complete: vi.fn().mockResolvedValue({ ok: false, reason: 'api_error', message: 'overloaded' }),
    });
    await expect(
      svc.compose({ handle: 'abc', actorUserId: 'u1', prompt: 'Say hello', locale: 'en' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
