import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { readDeskGrant, signDeskGrant } from './callbacks.desk-grant';

const SECRET = 'easy-secret';

describe('desk grant', () => {
  it('accepts this line and refuses another secret or another line', () => {
    const now = 1_000;
    const token = signDeskGrant({ id: 'azm', role: 'admin', expiry: 1_060, secret: SECRET });
    expect(readDeskGrant(token, SECRET, now)?.id).toBe('azm');
    expect(readDeskGrant(token, 'other-secret', now)).toBeNull();
    const body = 'azm.other.admin.1060';
    const foreign = `${body}.${createHmac('sha256', SECRET).update(body).digest('hex')}`;
    expect(readDeskGrant(foreign, SECRET, now)).toBeNull();
    expect(readDeskGrant(token, SECRET, 1_060)).toBeNull();
  });
});
