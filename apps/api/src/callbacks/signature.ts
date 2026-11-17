import { createHmac, timingSafeEqual } from 'node:crypto';

/** ElevenLabs HMAC. Header `ElevenLabs-Signature: t=<unix>,v0=<hex>`. Tolerance 30 minutes. */
export const ELEVENLABS_SIGNATURE_TOLERANCE_SEC = 30 * 60;

export function verifyElevenLabsSignature(
  rawBody: string,
  header: string | undefined,
  secret: string,
  nowMs: number = Date.now(),
): boolean {
  if (!header || !secret) return false;
  const parts = header.split(',').map((p) => p.trim());
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
  const signatures = parts.filter((p) => p.startsWith('v0=')).map((p) => p.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(nowMs / 1000) - ts) > ELEVENLABS_SIGNATURE_TOLERANCE_SEC) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  return signatures.some((sig) => {
    const got = Buffer.from(sig, 'utf8');
    if (got.length !== expectedBuf.length) return false;
    return timingSafeEqual(got, expectedBuf);
  });
}

export function signElevenLabs(rawBody: string, secret: string, timestampSec: number): string {
  const mac = createHmac('sha256', secret).update(`${timestampSec}.${rawBody}`).digest('hex');
  return `t=${timestampSec},v0=${mac}`;
}
