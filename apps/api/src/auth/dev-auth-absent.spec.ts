import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * EC-12 — prove the production auth bypass identifier is gone from auth/config
 * source (historical docs elsewhere may still mention the cutover).
 */
describe('EC-12 header auth bypass removed', () => {
  it('auth and config modules do not define the retired bypass flag', () => {
    const root = join(__dirname, '..');
    const files = [
      join(root, 'auth/jwt.guard.ts'),
      join(root, 'config/load.ts'),
      join(root, 'auth/auth.module.ts'),
    ];
    const banned = 'DEV' + '_AUTH';
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toContain(banned);
    }
  });
});
