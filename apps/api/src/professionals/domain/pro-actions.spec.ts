import { describe, expect, it } from 'vitest';

import { nextProAction } from './pro-actions';

describe('nextProAction', () => {
  it('ASSIGNED → start', () => {
    expect(nextProAction('ASSIGNED')).toBe('start');
  });

  it('IN_PROGRESS → deliver', () => {
    expect(nextProAction('IN_PROGRESS')).toBe('deliver');
  });

  it('other statuses → none', () => {
    expect(nextProAction('REQUESTED')).toBe('none');
    expect(nextProAction('DELIVERED')).toBe('none');
    expect(nextProAction('APPROVED')).toBe('none');
  });
});
