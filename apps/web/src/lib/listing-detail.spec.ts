import { describe, expect, it } from 'vitest';

import { plainDescription } from './listing-detail';

/** No tag openers or common XSS vectors may survive plain-text sanitization. */
function expectSafePlainText(result: string): void {
  expect(result).not.toMatch(/<\s*[a-z!/]/i);
  expect(result).not.toMatch(/onerror\s*=/i);
  expect(result).not.toMatch(/on\w+\s*=/i);
  expect(result).not.toMatch(/javascript:/i);
}

describe('plainDescription', () => {
  it('decodes entities and strips benign HTML', () => {
    expect(plainDescription('<p>Bell &amp; vista</p>')).toBe('Bell & vista');
    expect(plainDescription('  test  ')).toBe('test');
  });

  it('neutralises script tags', () => {
    const result = plainDescription('<script>alert(1)</script>');
    expectSafePlainText(result);
    expect(result).not.toMatch(/alert\s*\(/);
  });

  it('neutralises img onerror', () => {
    const result = plainDescription('<img src=x onerror=alert(1)>');
    expectSafePlainText(result);
  });

  it('neutralises incomplete/malformed tags', () => {
    const result = plainDescription('<img src="x" onerror="alert(1)');
    expectSafePlainText(result);
  });

  it('neutralises javascript: href', () => {
    const result = plainDescription('<a href="javascript:alert(1)">click</a>');
    expectSafePlainText(result);
    expect(result).not.toMatch(/javascript:/i);
  });

  it('neutralises nested/obfuscated tags', () => {
    const result = plainDescription('<scr<script>ipt>alert(1)</scr</script>ipt>');
    expectSafePlainText(result);
  });
});
