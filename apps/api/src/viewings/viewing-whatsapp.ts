/**
 * EC-16 / K EC 8.7 — Meta utility template body param order.
 * Match docs/runbooks/whatsapp-utility.md and Meta submissions (it/en/es).
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

export function formatViewingWhenParts(
  startMs: number,
  timeZone: string,
): { whenLocal: string; dateLocal: string; timeLocal: string } {
  const d = new Date(startMs);
  const whenLocal = new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(d);
  const dateLocal = new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(d);
  const timeLocal = new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(d);
  return { whenLocal, dateLocal, timeLocal };
}

/** Body {{n}} order must match Meta template definitions (EC-16 pack). */
export function viewingUtilityBodyParams(
  kind: ViewingNotifyKind,
  input: {
    recipientName: string;
    conductorName?: string;
    otherPartyPhone?: string;
    listing: ViewingWaListing;
    whenLocal: string;
    dateLocal: string;
    timeLocal: string;
  },
): string[] {
  const area = viewingAreaLabel(input.listing) || '—';
  const address = input.listing.address?.trim() || area;
  const title = input.listing.title;

  switch (kind) {
    case 'requested':
      // {{1}} conductor · {{2}} title · {{3}} when — no seeker name
      return [input.recipientName, title, input.whenLocal];
    case 'confirmed':
      // {{1}} title · {{2}} when · {{3}} address · {{4}} conductor
      return [title, input.whenLocal, address, input.conductorName ?? 'Host'];
    case 'reminder24h':
      // {{1}} title · {{2}} time · {{3}} address
      return [title, input.timeLocal, address];
    case 'reminder2h':
      // {{1}} title · {{2}} time · {{3}} address · {{4}} other party phone
      return [title, input.timeLocal, address, input.otherPartyPhone ?? '—'];
    case 'cancelled':
      // {{1}} title · {{2}} date · {{3}} time
      return [title, input.dateLocal, input.timeLocal];
  }
}

export function verifiedPhoneE164(user: {
  phone: string | null;
  phoneVerifiedAt: Date | null;
} | null): string | null {
  if (!user?.phone || !user.phoneVerifiedAt) return null;
  return user.phone;
}
