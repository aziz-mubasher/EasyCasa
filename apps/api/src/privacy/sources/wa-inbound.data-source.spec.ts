import { describe, expect, it, vi } from 'vitest';

import { WaInboundDataSource } from './wa-inbound.data-source';

function makeDb(opts: {
  phoneE164: string | null;
  messages?: Array<{
    providerMessageId: string;
    messageType: string;
    body: string | null;
    contactName?: string | null;
    receivedAt: Date;
    autoRepliedAt: Date | null;
  }>;
  outbound?: Array<{
    providerMessageId: string | null;
    body: string;
    source: string;
    sentAt: Date;
  }>;
  deletedIn?: number;
  deletedOut?: number;
}) {
  const messages = opts.messages ?? [];
  const outbound = opts.outbound ?? [];
  let orderCalls = 0;
  let deleteCalls = 0;
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ phoneE164: opts.phoneE164 }]),
          orderBy: vi.fn(async () => {
            orderCalls += 1;
            return orderCalls === 1 ? messages : outbound;
          }),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(async () => {
          deleteCalls += 1;
          // Order: outbound, notes, contacts, inbound (K EC 7.4).
          const n =
            deleteCalls === 1
              ? (opts.deletedOut ?? 0)
              : deleteCalls === 4
                ? (opts.deletedIn ?? 0)
                : 0;
          return Array.from({ length: n }, (_, i) => ({ id: `del-${deleteCalls}-${i}` }));
        }),
      })),
    })),
  };
}

describe('WaInboundDataSource (EC-19b phone_e164 match)', () => {
  it('exports messages when phone_e164 matches wa_id (mobile format)', async () => {
    const msg = {
      providerMessageId: 'wamid.1',
      messageType: 'text',
      body: 'ciao',
      contactName: null,
      receivedAt: new Date('2026-07-31T10:00:00Z'),
      autoRepliedAt: null,
    };
    const db = makeDb({ phoneE164: '393331234567', messages: [msg] });
    const src = new WaInboundDataSource(db as never);
    const out = await src.collect('user-1');
    expect(out.records).toHaveLength(1);
    expect(out.records[0]).toMatchObject({
      direction: 'inbound',
      provider_message_id: 'wamid.1',
      body: 'ciao',
    });
  });

  it('exports messages for Italian landline phone_e164', async () => {
    const msg = {
      providerMessageId: 'wamid.land',
      messageType: 'text',
      body: 'ufficio',
      contactName: null,
      receivedAt: new Date('2026-07-31T10:00:00Z'),
      autoRepliedAt: null,
    };
    const db = makeDb({ phoneE164: '39021234567', messages: [msg] });
    const src = new WaInboundDataSource(db as never);
    const out = await src.collect('user-land');
    expect(out.records).toHaveLength(1);
  });

  it('returns empty when phone_e164 is null (unparseable / unset)', async () => {
    const db = makeDb({ phoneE164: null, messages: [] });
    const src = new WaInboundDataSource(db as never);
    const out = await src.collect('user-none');
    expect(out.records).toHaveLength(0);
    expect(db.delete).not.toHaveBeenCalled();
  });

  it('erasure deletes by phone_e164 match', async () => {
    const db = makeDb({ phoneE164: '393331234567', deletedIn: 2, deletedOut: 1 });
    const src = new WaInboundDataSource(db as never);
    const out = await src.erase('user-1');
    expect(out.erased).toBe(3);
  });

  it('erasure with null phone_e164 erases nothing', async () => {
    const db = makeDb({ phoneE164: null });
    const src = new WaInboundDataSource(db as never);
    const out = await src.erase('user-none');
    expect(out.erased).toBe(0);
    expect(db.delete).not.toHaveBeenCalled();
  });
});
