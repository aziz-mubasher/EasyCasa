import { describe, expect, it } from 'vitest';

import { mergeSmartLinkAgent } from './smartlink-agent';

const PRIVATE = '+393339998877';

describe('mergeSmartLinkAgent', () => {
  it('does not take a phone from the profile when the payload has none', () => {
    const view = mergeSmartLinkAgent(
      { displayName: 'Private', phone: null, bio: null, slug: 'private' },
      { displayName: 'Private', phone: PRIVATE, bio: null, avatarUrl: null },
    );
    expect(view.phone).toBeNull();
    expect(JSON.stringify(view)).not.toContain(PRIVATE);
  });

  it('shows the phone when the share payload includes it', () => {
    const view = mergeSmartLinkAgent(
      { displayName: 'Studio', phone: ' +39 030 111 ', bio: null, slug: 'studio' },
      null,
    );
    expect(view.phone).toBe('+39 030 111');
  });
});
