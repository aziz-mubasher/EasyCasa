import { agentForPublic, type PublicAgentContact } from '../../listings/domain/public-contact';
import type { AgentSnapshot } from './types';

/**
 * Public SmartLink agent block. Same `agentForPublic` decision as the listing
 * routes. A stored snapshot phone is ignored, including links created before
 * the gate existed.
 */
export function projectPublicShareAgent(
  stored: Partial<AgentSnapshot> | null | undefined,
  contact: PublicAgentContact | null,
): AgentSnapshot {
  const view = agentForPublic(contact, {
    displayName: stored?.displayName,
    bio: stored?.bio,
    slug: stored?.slug,
    phone: stored?.phone,
  });
  return {
    displayName: view?.displayName ?? null,
    phone: view?.phone ?? null,
    bio: view?.bio ?? null,
    slug: view?.slug ?? null,
  };
}
