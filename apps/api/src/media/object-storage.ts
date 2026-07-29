import type { ApiConfig } from '../config/load';

/**
 * Resolved S3-compatible object store settings.
 * Pilot: `MEDIA_ORIGIN=bunny` writes listing masters to Bunny Storage Zone;
 * `minio` keeps the existing on-VPS path.
 */
export type ObjectStorageConfig = {
  origin: 'minio' | 'bunny';
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Public CDN / proxy base for listing image URLs (no trailing slash). */
  publicBase: string;
  /** Base for private `users/` keys — must not be a public CDN. */
  privateBase: string;
};

export function resolveObjectStorage(cfg: ApiConfig): ObjectStorageConfig {
  const origin = cfg.MEDIA_ORIGIN;
  const privateBase = (
    cfg.MEDIA_PRIVATE_BASE.trim() ||
    (origin === 'bunny' ? 'https://easycasaita.com/api/media/file' : cfg.MEDIA_PUBLIC_BASE)
  ).replace(/\/$/, '');

  if (origin === 'bunny') {
    const zone = cfg.BUNNY_STORAGE_ZONE.trim();
    const password = cfg.BUNNY_STORAGE_PASSWORD.trim();
    if (!zone || !password) {
      throw new Error(
        'MEDIA_ORIGIN=bunny requires BUNNY_STORAGE_ZONE and BUNNY_STORAGE_PASSWORD',
      );
    }
    const cdn = (cfg.BUNNY_CDN_BASE.trim() || cfg.MEDIA_PUBLIC_BASE).replace(/\/$/, '');
    return {
      origin: 'bunny',
      endpoint: cfg.BUNNY_STORAGE_ENDPOINT.replace(/\/$/, ''),
      region: cfg.BUNNY_S3_REGION.trim() || cfg.S3_REGION,
      accessKeyId: zone,
      secretAccessKey: password,
      bucket: zone,
      publicBase: cdn,
      privateBase,
    };
  }

  return {
    origin: 'minio',
    endpoint: cfg.S3_ENDPOINT.replace(/\/$/, ''),
    region: cfg.S3_REGION,
    accessKeyId: cfg.MINIO_ROOT_USER,
    secretAccessKey: cfg.MINIO_ROOT_PASSWORD,
    bucket: cfg.MINIO_BUCKET,
    publicBase: cfg.MEDIA_PUBLIC_BASE.replace(/\/$/, ''),
    privateBase,
  };
}

/** Listing images → public CDN; fascicolo / user docs → private API proxy. */
export function publicUrlForStorageKey(storage: ObjectStorageConfig, key: string): string {
  const base = key.startsWith('users/') ? storage.privateBase : storage.publicBase;
  return `${base}/${key}`;
}
