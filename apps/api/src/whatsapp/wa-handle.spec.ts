import { describe, expect, it } from 'vitest';

import { waHandleFor } from './wa-handle';

describe('waHandleFor (EC-19a)', () => {
  const secret = 'test-wa-handle-secret-xx';

  it('is stable for the same wa_id + secret', () => {
    const a = waHandleFor('393331112233', secret);
    const b = waHandleFor('393331112233', secret);
    expect(a).toBe(b);
    expect(a).toHaveLength(32);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });

  it('differs across wa_ids and secrets', () => {
    expect(waHandleFor('393331112233', secret)).not.toBe(waHandleFor('393445556677', secret));
    expect(waHandleFor('393331112233', secret)).not.toBe(
      waHandleFor('393331112233', 'other-wa-handle-secret'),
    );
  });

  it('is not the raw wa_id and not a plain sha256 of the phone', () => {
    const h = waHandleFor('393331112233', secret);
    expect(h).not.toContain('39333');
    expect(h).not.toBe('393331112233');
  });
});
