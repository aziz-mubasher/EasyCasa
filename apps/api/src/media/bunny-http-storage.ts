/**
 * Bunny Storage HTTP API (AccessKey + PUT/GET/DELETE).
 * Prefer this over the S3-compatible API — S3 must be enabled per zone and
 * often returns PermanentRedirect / ServiceUnavailable otherwise.
 */

export type BunnyHttpStorageConfig = {
  /** e.g. easycasaita */
  zone: string;
  /** Storage zone password / AccessKey */
  accessKey: string;
  /**
   * HTTP storage host (no path). Default https://storage.bunnycdn.com
   * Regional: https://de.storage.bunnycdn.com
   */
  httpBase: string;
};

export function resolveBunnyHttpBase(s3Endpoint: string, region: string): string {
  const trimmed = s3Endpoint.replace(/\/$/, '');
  // Explicit non-S3 HTTP host already configured
  if (/^https?:\/\/([a-z0-9]+\.)?storage\.bunnycdn\.com$/i.test(trimmed) && !/-s3\./i.test(trimmed)) {
    return trimmed;
  }
  // S3 regional host → try HTTP regional, but DE has no de.storage host —
  // fall back to global storage.bunnycdn.com which routes by zone.
  const s3Regional = trimmed.match(/^https?:\/\/([a-z0-9]+)-s3\.storage\.bunnycdn\.com$/i);
  if (s3Regional) {
    const r = s3Regional[1].toLowerCase();
    // Known HTTP regional hosts (de.storage does not resolve as of 2026-07)
    const known = new Set(['uk', 'ny', 'la', 'sg', 'se', 'jh', 'br', 'syd']);
    if (known.has(r)) return `https://${r}.storage.bunnycdn.com`;
    return 'https://storage.bunnycdn.com';
  }
  if (/storage\.bunnycdn\.com$/i.test(new URL(trimmed).hostname)) {
    const r = region.trim().toLowerCase();
    const known = new Set(['uk', 'ny', 'la', 'sg', 'se', 'jh', 'br', 'syd']);
    if (known.has(r)) return `https://${r}.storage.bunnycdn.com`;
  }
  return 'https://storage.bunnycdn.com';
}

function objectUrl(cfg: BunnyHttpStorageConfig, key: string): string {
  const base = cfg.httpBase.replace(/\/$/, '');
  const path = key
    .split('/')
    .filter(Boolean)
    .map((p) => encodeURIComponent(p))
    .join('/');
  return `${base}/${encodeURIComponent(cfg.zone)}/${path}`;
}

export async function bunnyHttpPut(
  cfg: BunnyHttpStorageConfig,
  key: string,
  body: Buffer,
  contentType: string,
  cacheControl?: string,
): Promise<void> {
  const headers: Record<string, string> = {
    AccessKey: cfg.accessKey,
    'Content-Type': contentType,
  };
  if (cacheControl) headers['Cache-Control'] = cacheControl;

  const res = await fetch(objectUrl(cfg, key), {
    method: 'PUT',
    headers,
    // Node Buffer is not in DOM BodyInit typings used by tsc
    body: new Uint8Array(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bunny PUT ${key} failed: ${res.status} ${text.slice(0, 200)}`);
  }
}

export async function bunnyHttpGet(
  cfg: BunnyHttpStorageConfig,
  key: string,
): Promise<{ body: Buffer; contentType: string }> {
  const res = await fetch(objectUrl(cfg, key), {
    method: 'GET',
    headers: { AccessKey: cfg.accessKey },
  });
  if (res.status === 404) {
    const err = new Error('not found');
    (err as Error & { code: string }).code = 'NotFound';
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bunny GET ${key} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    body: buf,
    contentType: res.headers.get('content-type') ?? 'application/octet-stream',
  };
}

export async function bunnyHttpDelete(cfg: BunnyHttpStorageConfig, key: string): Promise<void> {
  const res = await fetch(objectUrl(cfg, key), {
    method: 'DELETE',
    headers: { AccessKey: cfg.accessKey },
  });
  if (res.status === 404) return;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bunny DELETE ${key} failed: ${res.status} ${text.slice(0, 200)}`);
  }
}

export async function bunnyHttpExists(cfg: BunnyHttpStorageConfig, key: string): Promise<boolean> {
  const res = await fetch(objectUrl(cfg, key), {
    method: 'GET',
    headers: { AccessKey: cfg.accessKey },
  });
  if (res.status === 404) return false;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bunny HEAD/GET ${key} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  // Drain body so the connection can close cleanly
  await res.arrayBuffer().catch(() => undefined);
  return true;
}
