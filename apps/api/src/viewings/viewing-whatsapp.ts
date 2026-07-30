/**
 * Phase C (K EC 8.7) — Meta utility template names + body param order.
 * Street address only on confirmed + 2h reminder (disclosure ladder).
 */

export type ViewingNotifyKind =
  | 'requested'
  | 'confirmed'
  | 'cancelled'
  | 'reminder24h'
  | 'reminder2h';

export type ViewingWaTemplateConfig = {
  WHATSAPP_VIEWING_REMINDER_24H_TEMPLATE: string;
  WHATSAPP_VIEWING_REMINDER_2H_TEMPLATE: string;
  WHATSAPP_VIEWING_REQUESTED_TEMPLATE: string;
  WHATSAPP_VIEWING_CONFIRMED_TEMPLATE: string;
  WHATSAPP_VIEWING_CANCELLED_TEMPLATE: string;
  WHATSAPP_OTP_TEMPLATE_LANG: string;
};

export function viewingUtilityTemplateName(
  kind: ViewingNotifyKind,
  config: ViewingWaTemplateConfig,
): string {
  switch (kind) {
    case 'reminder24h':
      return config.WHATSAPP_VIEWING_REMINDER_24H_TEMPLATE.trim();
    case 'reminder2h':
      return config.WHATSAPP_VIEWING_REMINDER_2H_TEMPLATE.trim();
    case 'requested':
      return config.WHATSAPP_VIEWING_REQUESTED_TEMPLATE.trim();
    case 'confirmed':
      return config.WHATSAPP_VIEWING_CONFIRMED_TEMPLATE.trim();
    case 'cancelled':
      return config.WHATSAPP_VIEWING_CANCELLED_TEMPLATE.trim();
  }
}

export type ViewingWaListing = {
  title: string;
  address: string | null;
  city: string | null;
  province: string | null;
};

export function viewingAreaLabel(listing: Pick<ViewingWaListing, 'city' | 'province'>): string {
  return [listing.city, listing.province].filter(Boolean).join(', ');
}

/** Body {{n}} order must match Meta template definitions (see runbook). */
export function viewingUtilityBodyParams(
  kind: ViewingNotifyKind,
  input: {
    recipientName: string;
    seekerName?: string;
    listing: ViewingWaListing;
    whenLocal: string;
  },
): string[] {
  const area = viewingAreaLabel(input.listing) || '—';
  const address = input.listing.address?.trim() || area;
  const title = input.listing.title;
  const name = input.recipientName;

  switch (kind) {
    case 'reminder24h':
      // {{1}} name {{2}} title {{3}} area (no street) {{4}} when
      return [name, title, area, input.whenLocal];
    case 'reminder2h':
    case 'confirmed':
      // {{1}} name {{2}} title {{3}} address {{4}} when
      return [name, title, address, input.whenLocal];
    case 'requested':
      // {{1}} conductor {{2}} seeker {{3}} title {{4}} area {{5}} when
      return [name, input.seekerName ?? 'Seeker', title, area, input.whenLocal];
    case 'cancelled':
      // {{1}} name {{2}} title {{3}} area {{4}} when
      return [name, title, area, input.whenLocal];
  }
}

export function verifiedPhoneE164(user: {
  phone: string | null;
  phoneVerifiedAt: Date | null;
} | null): string | null {
  if (!user?.phone || !user.phoneVerifiedAt) return null;
  return user.phone;
}
