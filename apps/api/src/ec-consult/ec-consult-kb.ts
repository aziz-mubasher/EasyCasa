import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const KB_CANONICAL_ID = 'u3uED8EeEjWCpdXZK05z';
export const KB_FIRST_CONTACT_ID = 'Rjd2JDRoArsWMHvcQn4T';

export type KbSnapshot = {
  docId: string;
  text: string;
  hash: string;
  updatedAtUnix: number;
};

export function loadFixtureCanonicalKb(): KbSnapshot {
  const text = readFileSync(join(__dirname, 'fixtures/FIXTURE-KB-v1.2-canonical.txt'), 'utf8');
  const hash = createHash('sha256').update(text).digest('hex');
  return { docId: KB_CANONICAL_ID, text, hash, updatedAtUnix: 0 };
}

export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}