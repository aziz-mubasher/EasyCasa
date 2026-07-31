import { createHmac } from 'node:crypto';

/**
 * EC-19a — opaque handle for inbound WhatsApp routing.
 * HMAC-SHA256(wa_id, secret), truncated to 128 bits (32 hex chars).
 * Not a plain hash — E.164 keyspace is small enough to brute-force SHA-256.
 */
export function waHandleFor(waId: string, secret: string): string {
  return createHmac('sha256', secret).update(waId, 'utf8').digest('hex').slice(0, 32);
}
