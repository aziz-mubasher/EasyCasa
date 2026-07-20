import { describe, expect, it } from 'vitest';

import type { EmailPort } from '../email-port';
import { OutboxEmailProvider } from './outbox-email.provider';

describe('OutboxEmailProvider', () => {
  it('records sends and delegates the result', async () => {
    const delegate: EmailPort = {
      async send() {
        return { provider: 'smtp', delivered: true, id: 'x1' };
      },
    };
    const ob = new OutboxEmailProvider(delegate);
    const r = await ob.send({ to: 'a@b.it', subject: 'S', text: 'T' });
    expect(r).toMatchObject({ provider: 'smtp', delivered: true });
    expect(ob.list()).toHaveLength(1);
    expect(ob.list('a@b.it')).toHaveLength(1);
    expect(ob.list('other@x.it')).toHaveLength(0);
  });

  it('records even when the delegate throws (best-effort)', async () => {
    const delegate: EmailPort = {
      async send() {
        throw new Error('down');
      },
    };
    const ob = new OutboxEmailProvider(delegate);
    const r = await ob.send({ to: 'a@b.it', subject: 'S', text: 'T' });
    expect(r.delivered).toBe(false);
    expect(ob.list()).toHaveLength(1);
  });

  it('bounds the ring at capacity', async () => {
    const delegate: EmailPort = {
      async send() {
        return { provider: 'noop', delivered: false };
      },
    };
    const ob = new OutboxEmailProvider(delegate, 3);
    for (let i = 0; i < 5; i++) await ob.send({ to: `u${i}@x.it`, subject: 'S', text: 'T' });
    expect(ob.list()).toHaveLength(3);
    expect(ob.list()[0]?.message.to).toBe('u2@x.it');
  });
});
