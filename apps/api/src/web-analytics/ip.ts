const V4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function isV4(value: string): boolean {
  if (!V4.test(value)) return false;
  return value.split('.').every((p) => {
    const n = Number(p);
    return n >= 0 && n <= 255 && String(n) === String(Number(p));
  });
}

function isV6(value: string): boolean {
  if (!value.includes(':')) return false;
  if (value.split('::').length > 2) return false;
  return /^[0-9a-f:]+$/i.test(value);
}

/** Rightmost X-Forwarded-For hop, then X-Real-IP, then the socket address. */
export function clientIp(
  headers: Record<string, string | string[] | undefined>,
  socketIp: string | undefined,
): string | null {
  const xffRaw = headers['x-forwarded-for'];
  const xff = Array.isArray(xffRaw) ? xffRaw.join(',') : xffRaw;
  if (xff?.trim()) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && (isV4(last) || isV6(last))) return last;
  }
  const realRaw = headers['x-real-ip'];
  const real = (Array.isArray(realRaw) ? realRaw[0] : realRaw)?.trim();
  if (real && (isV4(real) || isV6(real))) return real;
  const fallback = socketIp?.replace(/^::ffff:/, '') ?? '';
  if (fallback && (isV4(fallback) || isV6(fallback))) return socketIp!.startsWith('::ffff:') && isV4(fallback) ? fallback : socketIp!;
  return null;
}

export function truncateIp(ip: string): string {
  const mapped = ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
  if (isV4(mapped)) {
    const [a, b, c] = mapped.split('.');
    return `${a}.${b}.${c}.0`;
  }
  if (!isV6(ip)) return '0.0.0.0';
  const groups = expandV6(ip);
  return `${groups[0]}:${groups[1]}:${groups[2]}::`;
}

function expandV6(ip: string): string[] {
  const halves = ip.split('::');
  const head = halves[0] ? halves[0].split(':').filter(Boolean) : [];
  const tail = halves[1] ? halves[1].split(':').filter(Boolean) : [];
  const missing = ip.includes('::') ? 8 - head.length - tail.length : 0;
  const groups = [...head, ...Array(Math.max(missing, 0)).fill('0'), ...tail].slice(0, 8);
  while (groups.length < 8) groups.push('0');
  return groups.map((g) => g.padStart(1, '0'));
}

export function throttleKey(ip: string | null): string {
  if (!ip) return 'unknown';
  return truncateIp(ip);
}
