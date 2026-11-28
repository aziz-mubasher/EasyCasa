import { describe, expect, it } from 'vitest';

import { canAccessView } from './roles';

describe('canAccessView whatsapp-only persona', () => {
  it('opens EC WhatsApp and nothing else in the admin nav', () => {
    expect(canAccessView(['whatsapp'], 'whatsapp')).toBe(true);
    for (const view of [
      'credentials',
      'coverage',
      'dsar',
      'takedown',
      'identity',
      'vo',
      'abuse',
      'partners',
      'aste',
      'orchestration',
      'compliance',
      'aml',
      'rli',
      'analytics',
      'callbacks',
      'crm',
    ]) {
      expect(canAccessView(['whatsapp'], view)).toBe(false);
    }
  });
});
