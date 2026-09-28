import type { PublicAgentProfile } from '@/lib/agent-public';
import type { SmartLinkPublicPayload } from '@/lib/smartlink';

export interface SmartLinkAgentView {
  name: string;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

/**
 * Phone is rendered only when the share payload already carries it.
 * A profile fetched by slug is not a second source for the number.
 */
export function mergeSmartLinkAgent(
  snapshot: SmartLinkPublicPayload['agent'],
  profile: PublicAgentProfile | null,
): SmartLinkAgentView {
  const phone = snapshot.phone?.trim();
  return {
    name: profile?.displayName ?? snapshot.displayName ?? '',
    phone: phone ? phone : null,
    bio: profile?.bio ?? snapshot.bio,
    avatarUrl: profile?.avatarUrl ?? null,
  };
}
