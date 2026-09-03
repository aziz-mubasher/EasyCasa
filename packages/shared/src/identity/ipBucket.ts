import { createHmac, timingSafeEqual } from 'node:crypto';

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

/**
 * IPv4 → the address. IPv6 → the /64, because a single household is handed a
 * /64 and treating /128s as distinct makes the counter useless.
 *
 * IPv4-mapped IPv6 (`::ffff:a.b.c.d`) is treated as IPv4.
 */
export function ipBucketKey(ip: string): string {
  const trimmed = stripZoneId(ip.trim());
  if (!trimmed) throw new Error('invalid ip');

  const v4mapped = ipv4Mapped(trimmed);
  if (v4mapped) return `ip4:${v4mapped}`;
  if (IPV4.test(trimmed)) return `ip4:${trimmed}`;
  if (trimmed.includes(':')) return `ip6:${ipv6Prefix64(trimmed)}`;
  throw new Error('invalid ip');
}

/**
 * HMAC with a server-side secret that rotates on a schedule.
 * The raw IP is hashed and must be discarded by the caller in the same function.
 */
export function bucketHash(key: string, salt: string): string {
  if (!salt) throw new Error('missing abuse salt');
  return createHmac('sha256', salt).update(key).digest('base64url');
}

/** Hash a request IP and return only the bucket hash. Never return the raw IP. */
export function hashClientIp(ip: string, salt: string): string {
  return bucketHash(ipBucketKey(ip), salt);
}

export function saltsDiffer(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return true;
  return !timingSafeEqual(left, right);
}

function stripZoneId(ip: string): string {
  const pct = ip.indexOf('%');
  return pct >= 0 ? ip.slice(0, pct) : ip;
}

function ipv4Mapped(ip: string): string | null {
  const lower = ip.toLowerCase();
  const marker = ':ffff:';
  const idx = lower.lastIndexOf(marker);
  if (idx < 0) return null;
  const tail = ip.slice(idx + marker.length);
  return IPV4.test(tail) ? tail : null;
}

/** First 64 bits of an IPv6 address, written as 4 hextets + `::`. */
export function ipv6Prefix64(ip: string): string {
  const hextets = expandIpv6(ip);
  return `${hextets.slice(0, 4).join(':')}::`;
}

function expandIpv6(ip: string): string[] {
  const clean = ip.replace(/^\[|\]$/g, '').toLowerCase();
  if (!clean.includes(':')) throw new Error('invalid ip');

  const [head, tail] = clean.split('::');
  const headParts = head ? head.split(':').filter(Boolean) : [];
  const tailParts = tail ? tail.split(':').filter(Boolean) : [];
  if (clean.includes('::')) {
    const missing = 8 - headParts.length - tailParts.length;
    if (missing < 0) throw new Error('invalid ip');
    return [...headParts, ...Array(missing).fill('0'), ...tailParts].map(normHextet);
  }
  if (headParts.length !== 8) throw new Error('invalid ip');
  return headParts.map(normHextet);
}

function normHextet(part: string): string {
  if (!/^[0-9a-f]{1,4}$/i.test(part)) throw new Error('invalid ip');
  return part.toLowerCase().padStart(4, '0');
}
