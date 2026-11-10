import { describe, expect, it } from 'vitest';

import { WaPresenceService } from './wa-presence';

describe('WhatsApp presence', () => {
  it('treats a consultant as online only while Available and the heartbeat is under two minutes', () => {
    const presence = new WaPresenceService();
    presence.beat('consultant', true, 0);
    expect(presence.online(60_000)).toEqual(['consultant']);
    expect(presence.online(120_001)).toEqual([]);
    presence.beat('consultant', false, 1_000);
    expect(presence.online(1_001)).toEqual([]);
  });
});
