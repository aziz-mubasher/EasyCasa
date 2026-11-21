import { createHmac, timingSafeEqual } from 'node:crypto';

export type DeskGrant = { id: string; line: 'easycasa'; role: 'none' | 'agent' | 'admin' };

/** The desk grant is id.line.role.expiry.hmac. Only this line verifies. */
export function readDeskGrant(token: string, secret: string, now = Math.floor(Date.now() / 1000)): DeskGrant | null {
  const parts = String(token || '').split('.');
  if (parts.length !== 5 || !secret) return null;
  const [id, line, role, expiry, signature] = parts;
  if (!id || line !== 'easycasa') return null;
  if (role !== 'none' && role !== 'agent' && role !== 'admin') return null;
  if (!/^\d+$/.test(expiry) || !/^[a-f0-9]{64}$/.test(signature)) return null;
  const body = `${id}.${line}.${role}.${expiry}`;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  if (Number(expiry) <= now) return null;
  return { id, line: 'easycasa', role };
}

export function signDeskGrant(input: { id: string; role: DeskGrant['role']; expiry: number; secret: string }): string {
  const body = `${input.id}.easycasa.${input.role}.${input.expiry}`;
  const signature = createHmac('sha256', input.secret).update(body).digest('hex');
  return `${body}.${signature}`;
}
