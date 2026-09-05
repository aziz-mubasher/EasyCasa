import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('desk call booking routes (ur / hi)', () => {
  it('keeps next-intl off /ur and /hi prenota-chiamata', () => {
    const mw = readFileSync(path.join(root, 'middleware.ts'), 'utf8');
    expect(mw).toContain('ur/prenota-chiamata');
    expect(mw).toContain('hi/prenota-chiamata');
  });

  it('ships dedicated booking pages', () => {
    const ur = readFileSync(path.join(root, 'app/ur/prenota-chiamata/page.tsx'), 'utf8');
    const hi = readFileSync(path.join(root, 'app/hi/prenota-chiamata/page.tsx'), 'utf8');
    expect(ur).toContain("deskCallMetadata('ur')");
    expect(hi).toContain("deskCallMetadata('hi')");
  });
});
