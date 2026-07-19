import type { EnquiryEvent, EnquiryIntent, EnquiryStatus } from './types';

export class EnquiryTransitionError extends Error {}
export class EnquiryValidationError extends Error {}

const TRANSITIONS: Readonly<
  Record<EnquiryStatus, Partial<Record<EnquiryEvent, EnquiryStatus>>>
> = {
  NEW: { CONTACT: 'CONTACTED', CLOSE: 'CLOSED' },
  CONTACTED: { QUALIFY: 'QUALIFIED', CLOSE: 'CLOSED' },
  QUALIFIED: { CONVERT: 'CONVERTED', CLOSE: 'CLOSED' },
  CONVERTED: {},
  CLOSED: { REOPEN: 'NEW' },
};

export function nextEnquiryStatus(current: EnquiryStatus, event: EnquiryEvent): EnquiryStatus {
  const next = TRANSITIONS[current][event];
  if (!next) throw new EnquiryTransitionError(`Illegal enquiry transition: ${event} from ${current}`);
  return next;
}

const INTENTS: readonly EnquiryIntent[] = ['info', 'viewing', 'offer'];

export interface EnquiryInput {
  intent: EnquiryIntent;
  message: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

/** Validate a new enquiry: known intent, a message, and at least one contact channel. */
export function validateEnquiryInput(input: EnquiryInput): void {
  if (!INTENTS.includes(input.intent)) throw new EnquiryValidationError('Unknown intent');
  if (input.message.trim().length < 1) throw new EnquiryValidationError('Message is required');
  if (input.message.length > 2000) throw new EnquiryValidationError('Message too long');
  if (!input.contactEmail && !input.contactPhone) {
    throw new EnquiryValidationError('At least one contact channel is required');
  }
}
