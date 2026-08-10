/**
 * EC-S-T14 — Verified Owner case state machine (@easycasa/shared).
 *
 * NEW domain: distinct from identity_review_requests (person identity),
 * kyc_cases (AML), and professionals' verification_status. Do not overload.
 *
 * Persistence target: verified_owner_case (SQL 0052). This module owns legal
 * transitions only; side effects (moderation_events append, badge DTO update)
 * are the API layer's job — the event-kind mapping is exported so the two
 * cannot drift.
 *
 * Framing (T04 row 7): listing anti-fraud, not brokerage. Gates (T05 §6.3,
 * Layer 1 version) are enforced BEFORE `SUBMIT` is reachable — collection off
 * means no case creation at all.
 */

export const VO_STATES = [
  'none', // no case for (seller, listing)
  'submitted', // seller uploaded docs; awaiting queue
  'in_review', // claimed by a VO moderator
  'verified', // badge active
  'rejected', // reviewer rejected; seller may resubmit
  'revoked', // badge withdrawn after being verified
  'expired', // validity window elapsed (system)
] as const;
export type VoState = (typeof VO_STATES)[number];

export type VoActor = 'seller' | 'vo_moderator' | 'system';

export type VoEventType = 'SUBMIT' | 'CLAIM' | 'VERIFY' | 'REJECT' | 'REVOKE' | 'EXPIRE';

export interface VoEvent {
  type: VoEventType;
  actor: VoActor;
  /** Mandatory human-readable reason for adverse decisions. */
  reason?: string;
}

/** moderation_events.kind values — extends IMAGE_DUPLICATE / IMAGE_NEAR_DUPLICATE. */
export const VO_MODERATION_KINDS: Record<VoEventType, string> = {
  SUBMIT: 'VO_SUBMITTED',
  CLAIM: 'VO_CLAIMED',
  VERIFY: 'VO_VERIFIED',
  REJECT: 'VO_REJECTED',
  REVOKE: 'VO_REVOKED',
  EXPIRE: 'VO_EXPIRED',
};

interface TransitionRule {
  from: readonly VoState[];
  to: VoState;
  actors: readonly VoActor[];
  requiresReason: boolean;
}

const RULES: Record<VoEventType, TransitionRule> = {
  SUBMIT: {
    from: ['none', 'rejected', 'expired'],
    to: 'submitted',
    actors: ['seller'],
    requiresReason: false,
  },
  CLAIM: {
    from: ['submitted'],
    to: 'in_review',
    actors: ['vo_moderator'],
    requiresReason: false,
  },
  VERIFY: {
    from: ['in_review'],
    to: 'verified',
    actors: ['vo_moderator'],
    requiresReason: false,
  },
  REJECT: {
    from: ['in_review'],
    to: 'rejected',
    actors: ['vo_moderator'],
    requiresReason: true,
  },
  REVOKE: {
    from: ['verified'],
    to: 'revoked',
    actors: ['vo_moderator', 'system'],
    requiresReason: true,
  },
  EXPIRE: {
    from: ['verified'],
    to: 'expired',
    actors: ['system'],
    requiresReason: false,
  },
};

export class VoTransitionError extends Error {
  constructor(
    public readonly state: VoState,
    public readonly event: VoEventType,
    detail: string,
  ) {
    super(`VO transition ${event} invalid from "${state}": ${detail}`);
    this.name = 'VoTransitionError';
  }
}

/** Pure transition. Throws VoTransitionError on any illegal move. */
export function transition(state: VoState, event: VoEvent): VoState {
  const rule = RULES[event.type];
  if (!rule.from.includes(state)) {
    throw new VoTransitionError(state, event.type, `allowed from ${rule.from.join('|')}`);
  }
  if (!rule.actors.includes(event.actor)) {
    throw new VoTransitionError(
      state,
      event.type,
      `actor "${event.actor}" not permitted (${rule.actors.join('|')})`,
    );
  }
  if (rule.requiresReason && !event.reason?.trim()) {
    throw new VoTransitionError(state, event.type, 'reason required');
  }
  return rule.to;
}

/** Events legal for a given state+actor — drives admin/seller UI affordances. */
export function allowedEvents(state: VoState, actor: VoActor): VoEventType[] {
  return (Object.keys(RULES) as VoEventType[]).filter((e) => {
    const r = RULES[e];
    return r.from.includes(state) && r.actors.includes(actor);
  });
}

/** Badge is publicly displayable only in exactly this state. */
export function badgeActive(state: VoState): boolean {
  return state === 'verified';
}

/** States in which the seller may (re)upload documents. */
export function uploadOpen(state: VoState): boolean {
  return state === 'none' || state === 'rejected' || state === 'expired';
}
