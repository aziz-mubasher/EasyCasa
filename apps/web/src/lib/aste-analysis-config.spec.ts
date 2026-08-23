import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  asteAnalysisPublicEnabled,
  asteInternalPreviewRouteMounted,
  asteAnalysisRouteMounted,
} from './aste-analysis-config';

describe('aste-analysis-config (EC-36)', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED;
    delete process.env.NEXT_PUBLIC_ASTE_INTERNAL_PREVIEW;
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it('defaults both flags off', () => {
    expect(asteAnalysisPublicEnabled()).toBe(false);
    expect(asteInternalPreviewRouteMounted()).toBe(false);
    expect(asteAnalysisRouteMounted()).toBe(false);
  });

  it('route mounted when either public or preview build flag is on', () => {
    process.env.NEXT_PUBLIC_ASTE_INTERNAL_PREVIEW = 'true';
    expect(asteAnalysisRouteMounted()).toBe(true);
    expect(asteAnalysisPublicEnabled()).toBe(false);
  });
});

describe('emailFromAccessToken', () => {
  it('reads email claim without verifying signature', async () => {
    const { emailFromAccessToken } = await import('./jwt-payload');
    const payload = Buffer.from(JSON.stringify({ email: 'ops@easycasa.it' })).toString('base64url');
    const token = `hdr.${payload}.sig`;
    expect(emailFromAccessToken(token)).toBe('ops@easycasa.it');
    expect(emailFromAccessToken(undefined)).toBeUndefined();
  });
});

describe('asteAnalysisServerAccessAllowed', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED;
    delete process.env.NEXT_PUBLIC_ASTE_INTERNAL_PREVIEW;
    delete process.env.ASTE_INTERNAL_PREVIEW;
    delete process.env.ASTE_INTERNAL_PREVIEW_EMAILS;
  });

  afterEach(() => {
    process.env = { ...prev };
    vi.doUnmock('next/headers');
  });

  it('public flag allows without cookie', async () => {
    process.env.NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED = 'true';
    vi.doMock('next/headers', () => ({
      cookies: async () => ({ get: () => undefined }),
    }));
    const { asteAnalysisServerAccessAllowed } = await import('./aste-access-server');
    expect(await asteAnalysisServerAccessAllowed()).toBe(true);
  });

  it('preview requires allowlisted cookie email', async () => {
    process.env.NEXT_PUBLIC_ASTE_INTERNAL_PREVIEW = 'true';
    process.env.ASTE_INTERNAL_PREVIEW = 'true';
    process.env.ASTE_INTERNAL_PREVIEW_EMAILS = 'ops@easycasa.it';
    const payload = Buffer.from(JSON.stringify({ email: 'ops@easycasa.it' })).toString('base64url');
    const token = encodeURIComponent(`hdr.${payload}.sig`);
    vi.doMock('next/headers', () => ({
      cookies: async () => ({ get: (k: string) => (k === 'ec_access' ? { value: token } : undefined) }),
    }));
    const { asteAnalysisServerAccessAllowed } = await import('./aste-access-server');
    expect(await asteAnalysisServerAccessAllowed()).toBe(true);
  });
});

describe('getAsteLabGateState', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED;
    delete process.env.NEXT_PUBLIC_ASTE_INTERNAL_PREVIEW;
    delete process.env.ASTE_INTERNAL_PREVIEW;
    delete process.env.ASTE_INTERNAL_PREVIEW_EMAILS;
    delete process.env.NEXT_PUBLIC_PAYMENTS_ENABLED;
  });

  afterEach(() => {
    process.env = { ...prev };
    vi.doUnmock('next/headers');
  });

  it('reports preview mounted but analisi blocked without session', async () => {
    process.env.NEXT_PUBLIC_ASTE_INTERNAL_PREVIEW = 'true';
    process.env.ASTE_INTERNAL_PREVIEW = 'true';
    process.env.ASTE_INTERNAL_PREVIEW_EMAILS = 'ops@easycasa.it';
    vi.doMock('next/headers', () => ({
      cookies: async () => ({ get: () => undefined }),
    }));
    const { getAsteLabGateState } = await import('./aste-access-server');
    const gate = await getAsteLabGateState();
    expect(gate.routeMounted).toBe(true);
    expect(gate.previewBuildMounted).toBe(true);
    expect(gate.previewRuntimeOn).toBe(true);
    expect(gate.allowlistConfigured).toBe(true);
    expect(gate.signedIn).toBe(false);
    expect(gate.canOpenAnalisi).toBe(false);
    expect(gate.publicEnabled).toBe(false);
  });
});
