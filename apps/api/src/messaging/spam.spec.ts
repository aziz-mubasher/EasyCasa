import { describe, it, expect } from 'vitest';
import { isLikelySpam, canStartConversation } from './spam';

describe('spam controls', () => {
  it('flags link-stuffed and shouty messages', () => {
    expect(isLikelySpam('http://a.com http://b.com http://c.com buy now')).toBe(true);
    expect(isLikelySpam('CLICK HERE TO WIN A FREE PRIZE NOW!!!!')).toBe(true);
  });
  it('passes a normal enquiry', () => {
    expect(isLikelySpam('Buongiorno, è disponibile per una visita sabato?')).toBe(false);
  });
  it('rate-limits new conversations', () => {
    expect(canStartConversation(9)).toBe(true);
    expect(canStartConversation(10)).toBe(false);
  });
});
