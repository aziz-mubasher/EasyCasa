import { randomUUID } from 'node:crypto';
import { EASY_CASA_VOICE_E164 } from '@easycasa/shared';

export { EASY_CASA_VOICE_E164 };

export function randomId(): string {
  return randomUUID();
}
