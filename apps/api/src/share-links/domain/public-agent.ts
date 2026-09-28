import type { PublicAgentContact } from '../../listings/domain/public-contact';
import type { AgentSnapshot } from './types';

/**
 * Public SmartLink agent block.
 * Phone comes only from the credential-gated contact. A stored snapshot phone
 * is ignored, including links created before the gate existed.
 */
export function projectPublicShareAgent(
  stored: Partial<AgentSnapshot> | null | undefined,
  contact: PublicAgentContact | null,
): AgentSnapshot {
  const storedSlug =
    stored?.slug && !stored.slug.startsWith('oidc:') ? stored.slug : null;
  return {
    displayName: contact?.displayName ?? stored?.displayName ?? null,
    phone: contact?.phone ?? null,
    bio: contact?.bio ?? stored?.bio ?? null,
    slug: contact?.slug ?? storedSlug,
  };
}
