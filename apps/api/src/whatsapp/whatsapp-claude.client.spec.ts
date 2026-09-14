import { afterEach, describe, expect, it, vi } from 'vitest';

import { WhatsAppClaudeClient } from './whatsapp-claude.client';

function cfg(overrides: Record<string, unknown> = {}) {
  return {
    DEMO_MODE: false,
    ANTHROPIC_API_KEY: 'sk-ant-test',
    ANTHROPIC_MODEL: 'claude-sonnet-4-5',
    ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
    ...overrides,
  };
}

describe('WhatsAppClaudeClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is off when the key is empty or demo mode', () => {
    expect(new WhatsAppClaudeClient(cfg({ ANTHROPIC_API_KEY: '' }) as never).configured).toBe(false);
    expect(new WhatsAppClaudeClient(cfg({ DEMO_MODE: true }) as never).configured).toBe(false);
    expect(new WhatsAppClaudeClient(cfg() as never).configured).toBe(true);
  });

  it('returns not_configured without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const client = new WhatsAppClaudeClient(cfg({ ANTHROPIC_API_KEY: '  ' }) as never);
    await expect(client.complete('sys', 'user')).resolves.toEqual({
      ok: false,
      reason: 'not_configured',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses text blocks from a successful Messages response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'claude-sonnet-4-5-20250929',
          content: [{ type: 'text', text: '{"draft":"Ciao"}' }],
        }),
      }),
    );
    const client = new WhatsAppClaudeClient(cfg() as never);
    const result = await client.complete('sys', 'user');
    expect(result).toEqual({
      ok: true,
      text: '{"draft":"Ciao"}',
      model: 'claude-sonnet-4-5-20250929',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'sk-ant-test',
          'anthropic-version': '2023-06-01',
        }),
      }),
    );
  });

  it('maps HTTP errors without leaking the API key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'invalid x-api-key' } }),
      }),
    );
    const client = new WhatsAppClaudeClient(cfg() as never);
    await expect(client.complete('sys', 'user')).resolves.toEqual({
      ok: false,
      reason: 'api_error',
      message: 'invalid x-api-key',
    });
  });
});
