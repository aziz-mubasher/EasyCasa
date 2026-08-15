import { describe, expect, it } from 'vitest';

import { isLikelySpam } from '../messaging/spam';

/** Pure helpers mirrored from EnquiryMessagingService rate rules for unit coverage. */
function canSendEnquiryReply(recentCount: number, limitPerHour = 30): boolean {
  return recentCount < limitPerHour;
}

describe('enquiry messaging spam helpers (T25 reuse)', () => {
  it('rejects empty / link spam / shouty text', () => {
    expect(isLikelySpam('')).toBe(true);
    expect(isLikelySpam('a')).toBe(true);
    expect(isLikelySpam('http://a.com http://b.com http://c.com more')).toBe(true);
    expect(isLikelySpam('THIS IS ALL CAPS AND LONG ENOUGH')).toBe(true);
    expect(isLikelySpam('Ciao, vorrei fissare una visita martedì')).toBe(false);
  });
});

describe('canSendEnquiryReply', () => {
  it('allows under hourly cap', () => {
    expect(canSendEnquiryReply(0)).toBe(true);
    expect(canSendEnquiryReply(29)).toBe(true);
    expect(canSendEnquiryReply(30)).toBe(false);
  });
});
