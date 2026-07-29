import { describe, expect, it } from 'vitest';

import { publicUrlForStorageKey, resolveObjectStorage } from './object-storage';
import type { ApiConfig } from '../config/load';

function baseCfg(over: Partial<ApiConfig> = {}): ApiConfig {
  return {
    MEDIA_ORIGIN: 'minio',
    S3_ENDPOINT: 'http://minio:9000',
    S3_REGION: 'us-east-1',
    MINIO_ROOT_USER: 'easycasa',
    MINIO_ROOT_PASSWORD: 'secret',
    MINIO_BUCKET: 'easycasa-media',
    MEDIA_PUBLIC_BASE: 'https://easycasaita.com/api/media/file',
    MEDIA_PRIVATE_BASE: '',
    BUNNY_STORAGE_ZONE: '',
    BUNNY_STORAGE_PASSWORD: '',
    BUNNY_STORAGE_ENDPOINT: 'https://storage.bunnycdn.com',
    BUNNY_CDN_BASE: '',
    BUNNY_S3_REGION: 'de',
    ...over,
  } as ApiConfig;
}

describe('resolveObjectStorage', () => {
  it('uses MinIO defaults', () => {
    const s = resolveObjectStorage(baseCfg());
    expect(s.origin).toBe('minio');
    expect(s.endpoint).toBe('http://minio:9000');
    expect(s.bucket).toBe('easycasa-media');
    expect(s.publicBase).toBe('https://easycasaita.com/api/media/file');
  });

  it('maps Bunny zone credentials when MEDIA_ORIGIN=bunny', () => {
    const s = resolveObjectStorage(
      baseCfg({
        MEDIA_ORIGIN: 'bunny',
        BUNNY_STORAGE_ZONE: 'easycasaita',
        BUNNY_STORAGE_PASSWORD: 'rotated-password',
        BUNNY_CDN_BASE: 'https://cdn.easycasaita.com',
      }),
    );
    expect(s.origin).toBe('bunny');
    expect(s.endpoint).toBe('https://de-s3.storage.bunnycdn.com');
    expect(s.accessKeyId).toBe('easycasaita');
    expect(s.secretAccessKey).toBe('rotated-password');
    expect(s.bucket).toBe('easycasaita');
    expect(s.publicBase).toBe('https://cdn.easycasaita.com');
    expect(s.privateBase).toBe('https://easycasaita.com/api/media/file');
  });

  it('fails fast when Bunny password missing', () => {
    expect(() =>
      resolveObjectStorage(
        baseCfg({
          MEDIA_ORIGIN: 'bunny',
          BUNNY_STORAGE_ZONE: 'easycasaita',
          BUNNY_STORAGE_PASSWORD: '',
        }),
      ),
    ).toThrow(/BUNNY_STORAGE_PASSWORD/);
  });
});

describe('publicUrlForStorageKey', () => {
  it('keeps users/ keys on the private base', () => {
    const s = resolveObjectStorage(
      baseCfg({
        MEDIA_ORIGIN: 'bunny',
        BUNNY_STORAGE_ZONE: 'easycasaita',
        BUNNY_STORAGE_PASSWORD: 'x',
        BUNNY_CDN_BASE: 'https://cdn.easycasaita.com',
      }),
    );
    expect(publicUrlForStorageKey(s, 'listings/a/abc.webp')).toBe(
      'https://cdn.easycasaita.com/listings/a/abc.webp',
    );
    expect(publicUrlForStorageKey(s, 'users/u1/docs/x.pdf')).toBe(
      'https://easycasaita.com/api/media/file/users/u1/docs/x.pdf',
    );
  });
});
