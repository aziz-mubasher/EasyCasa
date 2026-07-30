/**
 * EC-11 — static route authority coverage.
 *
 * Every HTTP handler in a `*.controller.ts` must be `@Public` or carry a
 * capability declaration (`@RequiresCapability`, `@RequiresAuth`, `@Roles`,
 * `@RequiresAdminRole`) on the method or its controller class.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..');
const METHOD_RE = /@(Get|Post|Put|Patch|Delete|Options|Head)\(/g;
const AUTH_RE =
  /@(Public|Roles|RequiresCapability|RequiresAuth|RequiresAdminRole)\b/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

function classLevelDeclared(text: string): boolean {
  const m = text.match(/@Controller\([^\)]*\)([\s\S]*?)export class/);
  if (!m) return false;
  return AUTH_RE.test(m[1]);
}

function methodDeclared(text: string, methodIndex: number): boolean {
  const window = text.slice(Math.max(0, methodIndex - 600), methodIndex);
  const prev = [...window.matchAll(METHOD_RE)];
  const chunk = prev.length ? window.slice(prev[prev.length - 1]!.index! + 1) : window;
  return AUTH_RE.test(chunk);
}

describe('EC-11 route authority coverage', () => {
  it('every controller handler is Public or capability-declared', () => {
    const files = walk(SRC);
    const gaps: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const classOk = classLevelDeclared(text);
      for (const m of text.matchAll(METHOD_RE)) {
        const idx = m.index ?? 0;
        if (classOk || methodDeclared(text, idx)) continue;
        const after = text.slice(idx, idx + 180);
        const name = after.match(/(?:async\s+)?(\w+)\s*\(/)?.[1] ?? '?';
        gaps.push(`${file.replace(SRC + '/', '')}:${name}`);
      }
    }
    expect(gaps, `Undeclared routes:\n${gaps.join('\n')}`).toEqual([]);
  }, 30_000);
});
