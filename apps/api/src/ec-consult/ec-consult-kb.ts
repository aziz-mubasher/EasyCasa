import { createHash } from 'node:crypto';
import { FIXTURE_KB_CANONICAL_TEXT } from './fixtures/kb-canonical.fixture';

export const KB_CANONICAL_ID = 'u3uED8EeEjWCpdXZK05z';
export const KB_FIRST_CONTACT_ID = 'Rjd2JDRoArsWMHvcQn4T';

export type KbSnapshot = {
  docId: string;
  text: string;
  hash: string;
  updatedAtUnix: number;
};

export function loadFixtureCanonicalKb(): KbSnapshot {
  const text = FIXTURE_KB_CANONICAL_TEXT;
  const hash = createHash('sha256').update(text).digest('hex');
  return { docId: KB_CANONICAL_ID, text, hash, updatedAtUnix: 0 };
}

export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}