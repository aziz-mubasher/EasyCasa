/**
 * Phase 24 client — enquiries. Powers the listing "Contact agent" CTA and the
 * owner/mediator inbox that qualifies and converts into the Phase 10 pipeline.
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';

export const EnquiryIntentSchema = z.enum(['info', 'viewing', 'offer']);
export type EnquiryIntent = z.infer<typeof EnquiryIntentSchema>;

export const EnquiryStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'CONVERTED',
  'CLOSED',
]);
export type EnquiryStatus = z.infer<typeof EnquiryStatusSchema>;

export type EnquiryEvent = 'CONTACT' | 'QUALIFY' | 'CONVERT' | 'CLOSE' | 'REOPEN';

export const EnquirySchema = z.object({
  id: z.string(),
  listingId: z.string(),
  seekerUserId: z.string(),
  ownerUserId: z.string(),
  mediatorUserId: z.string().nullable(),
  intent: EnquiryIntentSchema,
  status: EnquiryStatusSchema,
  message: z.string(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  orderId: z.string().nullable(),
});
export type Enquiry = z.infer<typeof EnquirySchema>;

export const ConvertResultSchema = z.object({
  enquiryId: z.string(),
  orderId: z.string(),
});
export type ConvertResult = z.infer<typeof ConvertResultSchema>;

export class EasyCasaEnquiriesApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(private readonly opts: RequesterOptions) {
    this.request = createRequester(opts);
  }

  create(
    listingId: string,
    body: {
      intent: EnquiryIntent;
      message: string;
      contactEmail?: string;
      contactPhone?: string;
    },
  ): Promise<Enquiry> {
    return this.request(`/listings/${encodeURIComponent(listingId)}/enquiries`, EnquirySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  listMine(): Promise<Enquiry[]> {
    return this.request('/me/enquiries', z.array(EnquirySchema));
  }

  listInbound(): Promise<Enquiry[]> {
    return this.request('/me/inbound-enquiries', z.array(EnquirySchema));
  }

  transition(id: string, event: EnquiryEvent): Promise<Enquiry> {
    return this.request(`/enquiries/${encodeURIComponent(id)}/transition`, EnquirySchema, {
      method: 'POST',
      body: JSON.stringify({ event }),
    });
  }

  convert(id: string): Promise<ConvertResult> {
    return this.request(`/enquiries/${encodeURIComponent(id)}/convert`, ConvertResultSchema, {
      method: 'POST',
    });
  }
}
