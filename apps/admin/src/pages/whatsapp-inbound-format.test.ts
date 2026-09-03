import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { formatClock, formatRemaining, threadPhone } from './whatsapp-inbound-format';

const PAGE = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'WhatsAppInbound.tsx'),
  'utf8',
);

describe('whatsapp inbound format', () => {
  it('formatRemaining', () => {
    expect(formatRemaining(0)).toBe('closed');
    expect(formatRemaining(90 * 60_000)).toBe('1h 30m');
    expect(formatRemaining(5 * 60_000)).toBe('0h 05m');
  });

  it('formatClock uses Italian hh:mm', () => {
    expect(formatClock('2026-09-03T14:07:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
  });

  it('does not dump wamid / phone_number_id / actor ids onto each bubble', () => {
    expect(PAGE).not.toContain('MessageDetails');
    expect(PAGE).not.toContain('phone_number_id');
    expect(PAGE).not.toContain('wamid');
    expect(PAGE).not.toMatch(/\{m\.(providerMessageId|phoneNumberId|actorUserId|windowExpiresAt)\}/);
    expect(PAGE).toContain('ecwa__composer');
    expect(PAGE).toContain('ecwa__thread-scroll');
  });

  it('threadPhone prefers a single E.164, never stacks masked + raw', () => {
    expect(
      threadPhone({ waIdE164: '+393331112233', waId: '393331112233', waIdMasked: '+39 ***2233' }),
    ).toBe('+393331112233');
    expect(threadPhone({ waId: '393331112233' })).toBe('+393331112233');
    expect(threadPhone({ waIdMasked: '+39 ***2233' })).toBe('+39 ***2233');
  });
});
