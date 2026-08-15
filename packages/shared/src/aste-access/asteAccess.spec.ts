import { describe, expect, it } from 'vitest';

import {
  asteAnalysisPipelineActive,
  asteUserAnalysisAccess,
  isAsteEmailAllowlisted,
  parseAstePreviewAllowlist,
} from './asteAccess';

describe('aste access (EC-36)', () => {
  it('parses comma allowlist case-insensitively', () => {
    expect(parseAstePreviewAllowlist('  A@B.com , b@c.it ')).toEqual(['a@b.com', 'b@c.it']);
    expect(parseAstePreviewAllowlist('')).toEqual([]);
  });

  it('public on ignores allowlist', () => {
    const cfg = { publicEnabled: true, internalPreview: false, allowlistRaw: '' };
    expect(asteUserAnalysisAccess(cfg, undefined)).toBe(true);
    expect(asteUserAnalysisAccess(cfg, 'other@x.it')).toBe(true);
  });

  it('preview off + public off is dark for everyone', () => {
    const cfg = { publicEnabled: false, internalPreview: false, allowlistRaw: 'a@b.com' };
    expect(asteUserAnalysisAccess(cfg, 'a@b.com')).toBe(false);
    expect(asteAnalysisPipelineActive(cfg)).toBe(false);
  });

  it('preview on allowlists emails only', () => {
    const cfg = {
      publicEnabled: false,
      internalPreview: true,
      allowlistRaw: 'ops@easycasa.it, aziz@example.com',
    };
    expect(asteUserAnalysisAccess(cfg, 'ops@easycasa.it')).toBe(true);
    expect(asteUserAnalysisAccess(cfg, 'OPS@easycasa.it')).toBe(true);
    expect(asteUserAnalysisAccess(cfg, 'anon@x.it')).toBe(false);
    expect(asteUserAnalysisAccess(cfg, undefined)).toBe(false);
    expect(asteAnalysisPipelineActive(cfg)).toBe(true);
  });

  it('preview on but empty allowlist keeps pipeline dark', () => {
    const cfg = { publicEnabled: false, internalPreview: true, allowlistRaw: '  , ' };
    expect(asteAnalysisPipelineActive(cfg)).toBe(false);
    expect(isAsteEmailAllowlisted('a@b.com', cfg.allowlistRaw)).toBe(false);
  });
});
