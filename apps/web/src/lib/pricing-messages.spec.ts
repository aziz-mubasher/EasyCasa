import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../messages');
const locales = ['it', 'en', 'es'] as const;

/**
 * Scan keys and source strings — not CSS-uppercased render.
 * Bare «provvigione» still appears in honest denials elsewhere (D10).
 * The banned set is the false enrolment / fee-on-close claims of §5.1.
 */
const BANNED_CLAIMS =
  /licensed mediator|mediatore abilitato|mediador habilitado|agenzia regolare|licensed agency|agencia regulada/i;

describe('PONTE message scan (EC-PRICING-FINAL §10)', () => {
  it('it/en/es message files contain none of the banned enrolment claims', () => {
    const hits: string[] = [];
    for (const locale of locales) {
      const raw = readFileSync(join(root, `${locale}.json`), 'utf8');
      const lines = raw.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (BANNED_CLAIMS.test(line)) hits.push(`${locale}.json:${i + 1}: ${line.trim()}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('pricing namespace does not name a provvigione we charge', () => {
    for (const locale of locales) {
      const data = JSON.parse(readFileSync(join(root, `${locale}.json`), 'utf8')) as {
        pricing: Record<string, unknown>;
      };
      expect(JSON.stringify(data.pricing)).not.toMatch(/provvigione/i);
      expect(data.pricing.disclosure).toBeUndefined();
    }
  });

  it('footer enrollment sentence is present in it, en and es', () => {
    for (const locale of locales) {
      const data = JSON.parse(readFileSync(join(root, `${locale}.json`), 'utf8')) as {
        footer: { enrollment: string };
      };
      expect(data.footer.enrollment.length).toBeGreaterThan(40);
      expect(data.footer.enrollment.toLowerCase()).toMatch(/mediazion|mediation|mediaci[oó]n/);
    }
  });
});
