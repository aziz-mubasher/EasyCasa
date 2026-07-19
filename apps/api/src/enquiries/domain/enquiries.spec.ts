import { describe, expect, it } from 'vitest';

import {
  EnquiryTransitionError,
  EnquiryValidationError,
  nextEnquiryStatus,
  validateEnquiryInput,
} from './state';
import { buildOrderDraftFromEnquiry, canConvertToOrder, planEnquiryRouting } from './routing';
import type { Enquiry } from './types';

describe('enquiry state machine', () => {
  it('happy path NEW → CONTACTED → QUALIFIED → CONVERTED', () => {
    expect(nextEnquiryStatus('NEW', 'CONTACT')).toBe('CONTACTED');
    expect(nextEnquiryStatus('CONTACTED', 'QUALIFY')).toBe('QUALIFIED');
    expect(nextEnquiryStatus('QUALIFIED', 'CONVERT')).toBe('CONVERTED');
  });

  it('can close from open states and reopen from closed', () => {
    expect(nextEnquiryStatus('NEW', 'CLOSE')).toBe('CLOSED');
    expect(nextEnquiryStatus('CLOSED', 'REOPEN')).toBe('NEW');
  });

  it('illegal transitions throw', () => {
    expect(() => nextEnquiryStatus('NEW', 'CONVERT')).toThrow(EnquiryTransitionError);
    expect(() => nextEnquiryStatus('CONVERTED', 'CONTACT')).toThrow(EnquiryTransitionError);
  });
});

describe('enquiry validation', () => {
  it('requires message + a contact channel', () => {
    expect(() =>
      validateEnquiryInput({ intent: 'viewing', message: '', contactEmail: 'a@b.it' }),
    ).toThrow(EnquiryValidationError);
    expect(() =>
      validateEnquiryInput({
        intent: 'viewing',
        message: 'Hi',
        contactEmail: null,
        contactPhone: null,
      }),
    ).toThrow(EnquiryValidationError);
    expect(() =>
      validateEnquiryInput({ intent: 'offer', message: 'Interested', contactPhone: '+3931234' }),
    ).not.toThrow();
  });
});

describe('enquiry routing + conversion', () => {
  it('notifies owner, and mediator when assigned; dedups', () => {
    const noMed = planEnquiryRouting('viewing', { ownerUserId: 'own', mediatorUserId: null });
    expect(noMed.notifyUserIds).toEqual(['own']);
    expect(noMed.createFollowUpTask).toBe(true);

    const withMed = planEnquiryRouting('offer', { ownerUserId: 'own', mediatorUserId: 'med' });
    expect([...withMed.notifyUserIds].sort()).toEqual(['med', 'own']);
  });

  it('info enquiries create no follow-up task', () => {
    expect(
      planEnquiryRouting('info', { ownerUserId: 'own', mediatorUserId: null }).createFollowUpTask,
    ).toBe(false);
  });

  function enq(over: Partial<Enquiry> = {}): Enquiry {
    return {
      id: 'e1',
      listingId: 'L1',
      seekerUserId: 'seek',
      ownerUserId: 'own',
      mediatorUserId: null,
      intent: 'offer',
      status: 'QUALIFIED',
      message: 'x',
      contactEmail: 'a@b.it',
      contactPhone: null,
      orderId: null,
      ...over,
    };
  }

  it('canConvertToOrder: only qualified, non-info, not already converted', () => {
    expect(canConvertToOrder(enq()).ok).toBe(true);
    expect(canConvertToOrder(enq({ status: 'NEW' })).ok).toBe(false);
    expect(canConvertToOrder(enq({ intent: 'info' })).ok).toBe(false);
    expect(canConvertToOrder(enq({ orderId: 'o1' })).ok).toBe(false);
  });

  it('buildOrderDraftFromEnquiry maps intent → buyer-side items', () => {
    expect(buildOrderDraftFromEnquiry(enq({ intent: 'offer' })).suggestedItemCodes).toEqual([
      'BUYER_MEDIATION',
      'OFFER_DRAFTING',
    ]);
    expect(buildOrderDraftFromEnquiry(enq({ intent: 'viewing' })).suggestedItemCodes).toEqual([
      'VIEWING_ACCOMPANIMENT',
    ]);
    const draft = buildOrderDraftFromEnquiry(enq());
    expect(draft.side).toBe('buyer');
    expect(draft.partyUserId).toBe('seek');
    expect(draft.subjectListingId).toBe('L1');
  });
});
