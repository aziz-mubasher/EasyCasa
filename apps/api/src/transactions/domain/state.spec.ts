import { describe, expect, it } from 'vitest';

import { nextMandateStatus, nextOrderStatus, TransitionError } from './state';

describe('mandate state machine', () => {
  it('DRAFT → SENT requires canProceed', () => {
    expect(nextMandateStatus('DRAFT', 'SEND', { canProceed: true })).toBe('SENT');
    expect(() => nextMandateStatus('DRAFT', 'SEND', { canProceed: false })).toThrow(
      TransitionError,
    );
    expect(() => nextMandateStatus('DRAFT', 'SEND')).toThrow(TransitionError);
  });

  it('SENT → SIGNED', () => {
    expect(nextMandateStatus('SENT', 'SIGN')).toBe('SIGNED');
  });

  it('cannot sign from DRAFT', () => {
    expect(() => nextMandateStatus('DRAFT', 'SIGN')).toThrow(TransitionError);
  });

  it('SIGNED is terminal', () => {
    expect(() => nextMandateStatus('SIGNED', 'WITHDRAW')).toThrow(TransitionError);
    expect(() => nextMandateStatus('SIGNED', 'SEND', { canProceed: true })).toThrow(
      TransitionError,
    );
  });

  it('SENT can be withdrawn or expire', () => {
    expect(nextMandateStatus('SENT', 'WITHDRAW')).toBe('WITHDRAWN');
    expect(nextMandateStatus('SENT', 'EXPIRE')).toBe('EXPIRED');
  });
});

describe('order state machine', () => {
  it('QUOTED → CONFIRMED → IN_PROGRESS → COMPLETED', () => {
    expect(nextOrderStatus('QUOTED', 'CONFIRM')).toBe('CONFIRMED');
    expect(nextOrderStatus('CONFIRMED', 'START')).toBe('IN_PROGRESS');
    expect(nextOrderStatus('IN_PROGRESS', 'COMPLETE')).toBe('COMPLETED');
  });

  it('cannot complete a quoted order', () => {
    expect(() => nextOrderStatus('QUOTED', 'COMPLETE')).toThrow(TransitionError);
  });

  it('cancellable until completion', () => {
    expect(nextOrderStatus('QUOTED', 'CANCEL')).toBe('CANCELLED');
    expect(nextOrderStatus('IN_PROGRESS', 'CANCEL')).toBe('CANCELLED');
    expect(() => nextOrderStatus('COMPLETED', 'CANCEL')).toThrow(TransitionError);
  });
});
