import { describe, expect, it } from 'vitest';

import type { PublicAgentContact } from '../../listings/domain/public-contact';
import { projectPublicShareAgent } from './public-agent';

const PRIVATE_PHONE = '+393339998877';
const AGENCY_PHONE = '+390301112233';

function contact(over: Partial<PublicAgentContact> = {}): PublicAgentContact {
  return {
    id: 'u1',
    displayName: 'Studio Rossi',
    phone: AGENCY_PHONE,
    slug: 'studio-rossi',
    bio: 'Agenzia',
    avatarUrl: null,
    ...over,
  };
}

describe('projectPublicShareAgent', () => {
  it('drops a stored private phone and any email on the snapshot', () => {
    const agent = projectPublicShareAgent(
      {
        displayName: 'Private',
        phone: PRIVATE_PHONE,
        bio: 'note',
        slug: 'private',
      },
      contact({ displayName: 'Private', phone: null, slug: 'private', bio: null }),
    );
    expect(agent.phone).toBeNull();
    expect(JSON.stringify(agent)).not.toContain(PRIVATE_PHONE);
    expect(agent).not.toHaveProperty('email');
  });

  it('keeps the agency phone from the gated contact', () => {
    const agent = projectPublicShareAgent(
      { displayName: 'Old', phone: PRIVATE_PHONE, bio: null, slug: null },
      contact(),
    );
    expect(agent.phone).toBe(AGENCY_PHONE);
    expect(agent.displayName).toBe('Studio Rossi');
  });

  it('does not fall back to the stored phone when the user is gone', () => {
    const agent = projectPublicShareAgent(
      { displayName: 'Gone', phone: PRIVATE_PHONE, bio: 'x', slug: 'gone' },
      null,
    );
    expect(agent.phone).toBeNull();
    expect(agent.displayName).toBe('Gone');
  });
});
