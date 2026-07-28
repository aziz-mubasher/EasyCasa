import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { HttpBanks4AllAdapter } from './http-banks4all.adapter';
import type { ApiConfig } from '../../config';

function cfg(base: string, partner = 'partner-secret'): ApiConfig {
  return {
    BANKS4ALL_ATTESTATION_BASE_URL: base,
    BANKS4ALL_PARTNER_TOKEN: partner,
  } as ApiConfig;
}

async function listen(
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>,
): Promise<{ server: Server; base: string }> {
  const server = createServer((req, res) => {
    void Promise.resolve(handler(req, res));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  return { server, base: `http://127.0.0.1:${addr.port}` };
}

const TOKEN = 'abcdef0123456789abcd';

describe('HttpBanks4AllAdapter fail-soft (real HTTP / network)', () => {
  const servers: Server[] = [];
  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (s) =>
          new Promise<void>((resolve) => {
            s.close(() => resolve());
          }),
      ),
    );
  });

  it('connection refused → unavailable', async () => {
    const adapter = new HttpBanks4AllAdapter(cfg('http://127.0.0.1:9'));
    await expect(adapter.verify(TOKEN)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('DNS resolution failure → unavailable', async () => {
    const adapter = new HttpBanks4AllAdapter(cfg('http://this-host-does-not-exist.invalid'));
    await expect(adapter.verify(TOKEN)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('500 → unavailable', async () => {
    const { server, base } = await listen((_req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Server error' }));
    });
    servers.push(server);
    await expect(new HttpBanks4AllAdapter(cfg(base)).verify(TOKEN)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('401 → not_found', async () => {
    const { server, base } = await listen((_req, res) => {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Unauthorized' }));
    });
    servers.push(server);
    await expect(new HttpBanks4AllAdapter(cfg(base)).verify(TOKEN)).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    });
  });

  it('malformed JSON on 200 → unavailable', async () => {
    const { server, base } = await listen((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{not-json');
    });
    servers.push(server);
    await expect(new HttpBanks4AllAdapter(cfg(base)).verify(TOKEN)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('200 missing expires_at → unavailable', async () => {
    const { server, base } = await listen((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'valid',
          band_max_cents: 32500000,
          holder_initials: 'M.R.',
        }),
      );
    });
    servers.push(server);
    await expect(new HttpBanks4AllAdapter(cfg(base)).verify(TOKEN)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it(
    'response slower than 3s timeout → unavailable',
    async () => {
      const { server, base } = await listen((_req, res) => {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'valid',
              band_max_cents: 32500000,
              expires_at: '2027-01-27',
              holder_initials: 'M.R.',
            }),
          );
        }, 4_500);
      });
      servers.push(server);
      await expect(new HttpBanks4AllAdapter(cfg(base)).verify(TOKEN)).resolves.toEqual({
        ok: false,
        reason: 'unavailable',
      });
    },
    15_000,
  );

  it('ignores extra keys on a valid body (storage minimisation)', async () => {
    const { server, base } = await listen((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'valid',
          band_max_cents: 32500000,
          expires_at: '2027-01-27',
          holder_initials: 'M.R.',
          national_id: 'SECRET-SHOULD-NOT-LEAK',
          email: 'seeker@example.com',
        }),
      );
    });
    servers.push(server);
    const out = await new HttpBanks4AllAdapter(cfg(base)).verify(TOKEN);
    expect(out).toEqual({
      ok: true,
      attestation: {
        status: 'valid',
        bandMaxCents: 32500000,
        expiresAt: '2027-01-27',
        holderInitials: 'M.R.',
      },
    });
    expect(JSON.stringify(out)).not.toContain('SECRET');
    expect(JSON.stringify(out)).not.toContain('seeker@');
  });
});
