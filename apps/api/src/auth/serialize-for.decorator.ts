import { SetMetadata } from '@nestjs/common';

export const SERIALIZE_FOR_KEY = 'authority:serialize-for';

/**
 * Projection gate — which audience serializer to apply.
 * Prefer distinct DTOs per audience; never one DTO with optional PII fields.
 */
export type SerializeAudience =
  | 'public'
  | 'seeker'
  | 'owner'
  | 'conductor'
  | 'professional'
  | 'admin'
  | 'admin.support'
  | 'admin.dpo';

export const SerializeFor = (audience: SerializeAudience) =>
  SetMetadata(SERIALIZE_FOR_KEY, audience);
