import { agentForPublic } from '@easycasa/shared';

import type { PublicAgentProfile } from '@/lib/agent-public';
import type { SmartLinkPublicPayload } from '@/lib/smartlink';

export interface SmartLinkAgentView {
  name: string;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

/**
 * Phone is decided only by `agentForPublic`. A profile fetched by slug can
 * fill name, bio, and portrait. It cannot fill the number.
 */
export function mergeSmartLinkAgent(
  snapshot: SmartLinkPublicPayload['agent'],
  profile: PublicAgentProfile | null,
): SmartLinkAgentView {
  const view = agentForPublic(
    {
      displayName: snapshot.displayName,
      phone: snapshot.phone,
      bio: snapshot.bio,
      slug: snapshot.slug,
    },
    {
      displayName: profile?.displayName,
      bio: profile?.bio,
      avatarUrl: profile?.avatarUrl,
      phone: profile?.phone,
    },
  );
  return {
    name: view?.displayName ?? '',
    phone: view?.phone ?? null,
    bio: view?.bio ?? null,
    avatarUrl: view?.avatarUrl ?? null,
  };
}
