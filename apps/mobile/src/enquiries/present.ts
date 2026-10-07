import type { EnquiryIntent, EnquiryStatus } from '@easycasa/api-client';

/** Statuses the seller inbox is allowed to present. */
export type PresentedEnquiryStatus = 'NEW' | 'CONTACTED' | 'CLOSED';

/** Intents the seeker may send. */
export type SeekerEnquiryIntent = Extract<EnquiryIntent, 'info' | 'viewing'>;

export const SEEKER_ENQUIRY_INTENTS: readonly SeekerEnquiryIntent[] = ['info', 'viewing'];

export function presentedEnquiryStatus(status: EnquiryStatus): PresentedEnquiryStatus {
  if (status === 'NEW' || status === 'CONTACTED') return status;
  return 'CLOSED';
}

/** Map an inbound intent onto a label key. Unknown intents are not named. */
export function presentedIntentKey(intent: string): SeekerEnquiryIntent | 'other' {
  if (intent === 'info' || intent === 'viewing') return intent;
  return 'other';
}

export function seekerIntent(intent: string): SeekerEnquiryIntent {
  return intent === 'info' ? 'info' : 'viewing';
}
