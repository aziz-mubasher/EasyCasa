import { describe, expect, it, vi } from 'vitest';

import { HttpBanks4AllAdapter } from './http-banks4all.adapter';
import type { ApiConfig } from '../../config';

function cfg(over: Partial<ApiConfig> = {}): ApiConfig {
  return {
    BANKS4ALL_ATTESTATION_BASE_URL: 'https://portal.banks4all.eu',
    BANKS4ALL_PARTNER_TOKEN: 'partner-secret',
    ...over,
  } as ApiConfig;
}

describe('HttpBanks4AllAdapter', () => {
  it('returns unavailable when not configured', async () => {
    const adapter = new HttpBanks4AllAdapter(
      cfg({ BANKS4ALL_ATTESTATION_BASE_URL: '', BANKS4ALL_PARTNER_TOKEN: '' }),
    );
    await expect(adapter.verify('tokentokentokentoken')).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('maps 200 valid body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'valid',
          band_max_cents: 32500000,
          expires_at: '2027-01-27',
          holder_initials: 'M.R.',
        }),
      }),
    );
    const adapter = new HttpBanks4AllAdapter(cfg());
    const out = await adapter.verify('abcdef0123456789abcd');
    expect(out).toEqual({
      ok: true,
      attestation: {
        status: 'valid',
        bandMaxCents: 32500000,
        expiresAt: '2027-01-27',
        holderInitials: 'M.R.',
      },
    });
    vi.unstubAllGlobals();
  });

  it('maps 404 and 401 to not_found', async () => {
    for (const status of [404, 401]) {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) }),
      );
      const adapter = new HttpBanks4AllAdapter(cfg());
      await expect(adapter.verify('tokentokentokentoken')).resolves.toEqual({
        ok: false,
        reason: 'not_found',
      });
      vi.unstubAllGlobals();
    }
  });

  it('maps timeout / network to unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })),
    );
    const adapter = new HttpBanks4AllAdapter(cfg());
    await expect(adapter.verify('tokentokentokentoken')).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
    vi.unstubAllGlobals();
  });

  it('maps malformed body to unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'valid', band_max_cents: 'nope' }),
      }),
    );
    const adapter = new HttpBanks4AllAdapter(cfg());
    await expect(adapter.verify('tokentokentokentoken')).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
    vi.unstubAllGlobals();
  });
});
