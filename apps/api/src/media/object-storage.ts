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

/**
 * Bunny's S3 API rejects the global host with PermanentRedirect to
 * `{region}-s3.storage.bunnycdn.com`. Prefer an explicit endpoint; otherwise
 * derive the regional host from `BUNNY_S3_REGION`.
 */
export function resolveBunnyS3Endpoint(endpoint: string, region: string): string {
  const trimmed = endpoint.replace(/\/$/, '');
  const globalHosts = new Set([
    'https://storage.bunnycdn.com',
    'http://storage.bunnycdn.com',
  ]);
  if (!globalHosts.has(trimmed)) return trimmed;
  const r = region.trim().toLowerCase();
  if (!r || r === 'us-east-1') return trimmed;
  return `https://${r}-s3.storage.bunnycdn.com`;
}

/**
 * Always-MinIO store for private `users/` docs (VO / checklist).
 * Listing origin may be Bunny after PK-4; private docs must never go to the public CDN.
 */
export function resolveMinioObjectStorage(cfg: ApiConfig): ObjectStorageConfig {
  const privateBase = (
    cfg.MEDIA_PRIVATE_BASE.trim() || 'https://easycasaita.com/api/media/file'
  ).replace(/\/$/, '');
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

export function resolveObjectStorage(cfg: ApiConfig): ObjectStorageConfig {
  // EC-S-T10: when MEDIA_CDN_ENABLED is false, do not use Bunny even if
  // MEDIA_ORIGIN=bunny is set (common in prod that already migrated). Fall
  // back to MinIO so the API can boot; flip MEDIA_CDN_ENABLED=true after
  // DPA/counsel to re-enable Bunny as the active origin.
  //
  // Do not `{ ...cfg }` — callers may pass the `apiConfig` Proxy whose own
  // keys are empty; spreading would drop all resolved env values.
  const origin: 'minio' | 'bunny' =
    cfg.MEDIA_ORIGIN === 'bunny' && !cfg.MEDIA_CDN_ENABLED ? 'minio' : cfg.MEDIA_ORIGIN;

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
    const region = cfg.BUNNY_S3_REGION.trim() || cfg.S3_REGION;
    const cdn = (cfg.BUNNY_CDN_BASE.trim() || cfg.MEDIA_PUBLIC_BASE).replace(/\/$/, '');
    return {
      origin: 'bunny',
      endpoint: resolveBunnyS3Endpoint(cfg.BUNNY_STORAGE_ENDPOINT, region),
      region,
      accessKeyId: zone,
      secretAccessKey: password,
      bucket: zone,
      publicBase: cdn,
      privateBase,
    };
  }

  return resolveMinioObjectStorage(cfg);
}

/** Listing images → public CDN; fascicolo / user docs → private API proxy. */
export function publicUrlForStorageKey(storage: ObjectStorageConfig, key: string): string {
  const base = key.startsWith('users/') ? storage.privateBase : storage.publicBase;
  return `${base}/${key}`;
}
