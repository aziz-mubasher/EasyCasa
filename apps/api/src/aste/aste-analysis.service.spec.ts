import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { AsteAnalysisEnabledGuard } from './aste-analysis.guard';

describe('AsteAnalysisEnabledGuard', () => {
  it('404s when flag is off', () => {
    const guard = new AsteAnalysisEnabledGuard({
      ASTE_ANALYSIS_ENABLED: false,
      ASTE_INTERNAL_PREVIEW: false,
      ASTE_INTERNAL_PREVIEW_EMAILS: '',
    } as never);
    expect(() => guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({}) }) } as never)).toThrow(
      NotFoundException,
    );
  });

  it('allows when public flag is on', () => {
    const guard = new AsteAnalysisEnabledGuard({
      ASTE_ANALYSIS_ENABLED: true,
      ASTE_INTERNAL_PREVIEW: false,
      ASTE_INTERNAL_PREVIEW_EMAILS: '',
    } as never);
    expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ user: { email: 'a@b.com' } }) }),
      } as never),
    ).toBe(true);
  });
});

describe('AsteStorage key layout', () => {
  it('builds users/aste keys with sanitized basename', async () => {
    const { AsteStorage } = await import('./aste-storage');
    const storage = new AsteStorage({
      MEDIA_ORIGIN: 'minio',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      MINIO_ROOT_USER: 'easycasa',
      MINIO_ROOT_PASSWORD: 'change_me_minio',
      MINIO_BUCKET: 'easycasa-media',
      MEDIA_PUBLIC_BASE: 'http://localhost:9000/easycasa-media',
      MEDIA_PRIVATE_BASE: '',
      BUNNY_STORAGE_ZONE: '',
      BUNNY_STORAGE_PASSWORD: '',
      BUNNY_STORAGE_ENDPOINT: 'https://storage.bunnycdn.com',
      BUNNY_CDN_BASE: '',
      BUNNY_S3_REGION: 'de',
    } as never);
    const key = storage.buildKey('user-1', 'an-1', 'doc-1', '../../evil pdf name.pdf');
    expect(key).toBe('users/user-1/aste/an-1/doc-1/evil_pdf_name.pdf');
    expect(key.startsWith('users/')).toBe(true);
    expect(key.includes('..')).toBe(false);
  });
});

describe('AsteAnalysisService.create', () => {
  it('persists draft and emits analytics without PII', async () => {
    const { AsteAnalysisService } = await import('./aste-analysis.service');
    const returning = vi.fn(async () => [
      {
        id: 'a1',
        userId: 'u1',
        status: 'draft',
        language: 'it',
        register: 'investor',
        tribunale: null,
        rge: null,
        lotto: null,
        lottoLabel: null,
        dataAsta: null,
        termineOfferte: null,
        addressRaw: null,
        comune: null,
        provincia: null,
        extraction: null,
        semaforo: null,
        omiCheck: null,
        buyerProfile: null,
        translations: null,
        failureReason: null,
        attempts: 0,
        processingStartedAt: null,
        internalPreview: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);
    const db = {
      insert: vi.fn(() => ({ values: vi.fn(() => ({ returning })) })),
    };
    const storage = { buildKey: vi.fn(), putObject: vi.fn(), deleteObject: vi.fn() };
    const analytics = { track: vi.fn() };
    const audit = { record: vi.fn(async () => ({ id: 'audit-1' })) };
    const crmHooks = { onAsteAnalysisCreated: vi.fn(async () => undefined) };
    const service = new AsteAnalysisService(
      db as never,
      {
        ASTE_ANALYSIS_ENABLED: false,
        ASTE_INTERNAL_PREVIEW: true,
      } as never,
      storage as never,
      analytics as never,
      audit as never,
      crmHooks as never,
    );
    const row = await service.create('u1', { language: 'es', register: 'first_buyer' });
    expect(row.id).toBe('a1');
    expect(analytics.track).toHaveBeenCalledWith(
      'aste.analysis_created',
      expect.objectContaining({ language: 'es', register: 'first_buyer' }),
    );
    const props = analytics.track.mock.calls[0]![1] as Record<string, unknown>;
    expect(props).not.toHaveProperty('email');
    expect(props).not.toHaveProperty('userId');
    expect(db.insert).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'aste.internal_preview_analysis_created' }),
    );
    expect(crmHooks.onAsteAnalysisCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        analysisId: 'a1',
        language: 'es',
        register: 'first_buyer',
      }),
    );
    const hookArg = crmHooks.onAsteAnalysisCreated.mock.calls[0]![0] as Record<string, unknown>;
    expect(JSON.stringify(hookArg)).not.toMatch(/codice.?fiscale|debitore|buyer_profile/i);
  });
});
