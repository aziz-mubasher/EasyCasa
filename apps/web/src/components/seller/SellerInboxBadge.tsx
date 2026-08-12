'use client';

import { useTranslations } from 'next-intl';

import {
  formatBadgeExpiresAt,
  formatInboxBandMax,
  inboxBadgeLabelKey,
  type InboxItemApi,
} from '@/lib/seller-inbox';

type Props = {
  item: InboxItemApi;
  locale: string;
};

/** EC-1 four-field buyer badge — renders nothing when badgeDisplay is none. */
export function SellerInboxBadge({ item, locale }: Props) {
  const t = useTranslations('sellerInbox');
  const labelKey = inboxBadgeLabelKey(item.badgeDisplay);
  if (!labelKey || !item.badge) return null;

  const amount = formatInboxBandMax(item.badge.bandMaxCents, locale);
  const expires = formatBadgeExpiresAt(item.badge.expiresAt, locale);

  return (
    <div
      className={`si-badge si-badge--${item.badgeDisplay}`}
      data-testid="seller-inbox-badge"
      data-badge-state={item.badgeDisplay}
    >
      <p className="si-badge__label">{t(`badge.${labelKey}`)}</p>
      <p className="si-badge__row">{t('bandMax', { amount })}</p>
      <p className="si-badge__row">{t('holderInitials', { initials: item.badge.holderInitials })}</p>
      <p className="si-badge__row">{t('expiresAt', { when: expires })}</p>
    </div>
  );
}
