/** EC-S-T14 — exhaustive FSM transition tests. */

import { describe, it, expect } from 'vitest';
import {
  VO_STATES,
  VO_MODERATION_KINDS,
  transition,
  allowedEvents,
  badgeActive,
  uploadOpen,
  VoTransitionError,
  type VoState,
  type VoEventType,
  type VoActor,
} from '@easycasa/shared';

const ALL_EVENTS: VoEventType[] = ['SUBMIT', 'CLAIM', 'VERIFY', 'REJECT', 'REVOKE', 'EXPIRE'];
const ALL_ACTORS: VoActor[] = ['seller', 'vo_moderator', 'system'];

describe('happy path', () => {
  it('none → submitted → in_review → verified', () => {
    let s: VoState = 'none';
    s = transition(s, { type: 'SUBMIT', actor: 'seller' });
    expect(s).toBe('submitted');
    s = transition(s, { type: 'CLAIM', actor: 'vo_moderator' });
    expect(s).toBe('in_review');
    s = transition(s, { type: 'VERIFY', actor: 'vo_moderator' });
    expect(s).toBe('verified');
    expect(badgeActive(s)).toBe(true);
  });

  it('reject → resubmit loop', () => {
    let s: VoState = 'in_review';
    s = transition(s, { type: 'REJECT', actor: 'vo_moderator', reason: 'visura illeggibile' });
    expect(s).toBe('rejected');
    expect(uploadOpen(s)).toBe(true);
    s = transition(s, { type: 'SUBMIT', actor: 'seller' });
    expect(s).toBe('submitted');
  });

  it('verified → revoked (moderator or system, reason required) and → expired (system)', () => {
    expect(
      transition('verified', {
        type: 'REVOKE',
        actor: 'vo_moderator',
        reason: 'ownership change',
      }),
    ).toBe('revoked');
    expect(
      transition('verified', {
        type: 'REVOKE',
        actor: 'system',
        reason: 'nightly sweep: attestation revoked',
      }),
    ).toBe('revoked');
    expect(transition('verified', { type: 'EXPIRE', actor: 'system' })).toBe('expired');
  });

  it('expired allows resubmission', () => {
    expect(transition('expired', { type: 'SUBMIT', actor: 'seller' })).toBe('submitted');
  });
});

describe('guards', () => {
  it('adverse decisions require a reason', () => {
    expect(() => transition('in_review', { type: 'REJECT', actor: 'vo_moderator' })).toThrow(
      /reason required/,
    );
    expect(() =>
      transition('verified', { type: 'REVOKE', actor: 'vo_moderator', reason: '  ' }),
    ).toThrow(/reason required/);
  });

  it('actor permissions are enforced', () => {
    expect(() => transition('submitted', { type: 'CLAIM', actor: 'seller' })).toThrow(
      VoTransitionError,
    );
    expect(() => transition('in_review', { type: 'VERIFY', actor: 'system' })).toThrow(
      /not permitted/,
    );
    expect(() => transition('verified', { type: 'EXPIRE', actor: 'vo_moderator' })).toThrow(
      /not permitted/,
    );
    expect(() => transition('none', { type: 'SUBMIT', actor: 'vo_moderator' })).toThrow(
      /not permitted/,
    );
  });

  it('badge is active ONLY in verified', () => {
    for (const s of VO_STATES) {
      expect(badgeActive(s)).toBe(s === 'verified');
    }
  });
});

describe('exhaustive legality matrix', () => {
  it('total function over the full space', () => {
    for (const s of VO_STATES) {
      for (const e of ALL_EVENTS) {
        for (const a of ALL_ACTORS) {
          try {
            const out = transition(s, { type: e, actor: a, reason: 'x' });
            expect(VO_STATES).toContain(out);
          } catch (err) {
            expect(err).toBeInstanceOf(VoTransitionError);
          }
        }
      }
    }
  });

  it('allowedEvents agrees with transition()', () => {
    for (const s of VO_STATES) {
      for (const a of ALL_ACTORS) {
        const allowed = new Set(allowedEvents(s, a));
        for (const e of ALL_EVENTS) {
          let legal = true;
          try {
            transition(s, { type: e, actor: a, reason: 'x' });
          } catch {
            legal = false;
          }
          expect(allowed.has(e)).toBe(legal);
        }
      }
    }
  });

  it('terminal-ish states: revoked has no outgoing events for any actor', () => {
    for (const a of ALL_ACTORS) expect(allowedEvents('revoked', a)).toEqual([]);
  });
});

describe('moderation_events mapping', () => {
  it('covers every event type with VO_ prefixed kinds', () => {
    for (const e of ALL_EVENTS) {
      expect(VO_MODERATION_KINDS[e]).toMatch(/^VO_[A-Z_]+$/);
    }
    expect(new Set(Object.values(VO_MODERATION_KINDS)).size).toBe(ALL_EVENTS.length);
  });
});
