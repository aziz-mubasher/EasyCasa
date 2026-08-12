/** EC-S-T20 — dark seller enquiry inbox UI flag (build-time). Default off. */
export function sellerInboxEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SELLER_INBOX_ENABLED === 'true';
}

/** Server route guard — returns false when the inbox page must 404. */
export function sellerInboxRouteAllowed(): boolean {
  return sellerInboxEnabled();
}
