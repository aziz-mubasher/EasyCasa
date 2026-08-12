'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { InboxSort } from '@easycasa/shared';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { Link } from '@/i18n/routing';
import {
  buildEnquiriesQuery,
  formatBandAmount,
  formatReceivedAt,
  resolveInboxPanelState,
  type SellerInboxItemWire,
  type SellerInboxListResponse,
} from '@/lib/seller-inbox-panel-state';

import './seller-inbox.css';

export function SellerInboxPanel() {
  const t = useTranslations('sellerInbox');
  const locale = useLocale();
  const { ready, isAuthenticated, getAccessToken, signIn } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);

  const [items, setItems] = useState<SellerInboxItemWire[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<InboxSort>('newest');
  const [badgedOnly, setBadgedOnly] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = buildEnquiriesQuery({ sort, badgedOnly, unreadOnly });
      const res = await authedFetch(`${apiUrl('/seller/enquiries')}?${query}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.status === 404) {
        setError('unavailable');
        setItems([]);
        setUnreadTotal(0);
        return;
      }
      if (!res.ok) {
        setError('load');
        setItems([]);
        setUnreadTotal(0);
        return;
      }
      const body = (await res.json()) as SellerInboxListResponse;
      setItems(body.items ?? []);
      setUnreadTotal(body.unreadTotal ?? 0);
    } catch {
      setError('load');
      setItems([]);
      setUnreadTotal(0);
    } finally {
      setLoading(false);
    }
  }, [authedFetch, sort, badgedOnly, unreadOnly]);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void loadInbox();
  }, [ready, isAuthenticated, loadInbox]);

  async function markRead(id: string) {
    setMarkingId(id);
    try {
      const res = await authedFetch(apiUrl(`/seller/enquiries/${encodeURIComponent(id)}/read`), {
        method: 'PATCH',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
        );
        setUnreadTotal((n) => Math.max(0, n - 1));
      }
    } finally {
      setMarkingId(null);
    }
  }

  const panelState = resolveInboxPanelState({
    ready,
    isAuthenticated,
    loading,
    error,
    itemCount: items.length,
  });

  if (panelState === 'signIn') {
    return (
      <div className="si-panel" data-testid="seller-inbox-sign-in">
        <p className="si-muted">{t('signIn')}</p>
        <button
          type="button"
          className="si-btn"
          onClick={() =>
            void signIn(typeof window !== 'undefined' ? window.location.pathname : '/seller/enquiries')
          }
        >
          {t('signInCta')}
        </button>
      </div>
    );
  }

  if (panelState === 'loading') {
    return (
      <div className="si-panel" aria-busy="true" data-testid="seller-inbox-loading">
        <p className="si-muted">{t('loading')}</p>
      </div>
    );
  }

  if (panelState === 'unavailable') {
    return (
      <div className="si-panel" data-testid="seller-inbox-unavailable">
        <p className="si-muted">{t('unavailable')}</p>
      </div>
    );
  }

  if (panelState === 'error') {
    return (
      <div className="si-panel" data-testid="seller-inbox-error">
        <p className="si-muted">{t('error')}</p>
      </div>
    );
  }

  return (
    <section className="si-panel" data-testid="seller-inbox-panel">
      <div className="si-toolbar">
        <label className="si-field">
          <span className="si-field__label">{t('sortLabel')}</span>
          <select
            className="si-field__select"
            value={sort}
            onChange={(e) => setSort(e.target.value as InboxSort)}
            aria-label={t('sortLabel')}
          >
            <option value="newest">{t('sortNewest')}</option>
            <option value="badge_first">{t('sortBadgeFirst')}</option>
            <option value="unread_first">{t('sortUnreadFirst')}</option>
          </select>
        </label>
        <div className="si-filters">
          <label>
            <input
              type="checkbox"
              checked={badgedOnly}
              onChange={(e) => setBadgedOnly(e.target.checked)}
            />{' '}
            {t('filterBadgedOnly')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />{' '}
            {t('filterUnreadOnly')}
          </label>
        </div>
      </div>

      {unreadTotal > 0 ? (
        <p className="si-summary" data-testid="seller-inbox-unread-total">
          {t('unreadTotal', { count: unreadTotal })}
        </p>
      ) : null}

      {panelState === 'empty' ? (
        <p className="si-muted" data-testid="seller-inbox-empty">
          {t('empty')}
        </p>
      ) : (
        <ul className="si-list" data-testid="seller-inbox-list">
          {items.map((item) => (
            <li
              key={item.id}
              className={`si-card${item.read ? '' : ' si-card--unread'}`}
              data-testid={`seller-inbox-item-${item.id}`}
            >
              <div className="si-card__header">
                <p className="si-card__meta">{t('receivedAt', { when: formatReceivedAt(item.receivedAt, locale) })}</p>
                {!item.read ? (
                  <button
                    type="button"
                    className="si-btn si-btn--ghost"
                    disabled={markingId === item.id}
                    onClick={() => void markRead(item.id)}
                  >
                    {t('markRead')}
                  </button>
                ) : null}
              </div>
              <p className="si-card__listing">
                <Link href={`/listings/${item.listingId}`}>{t('listingLink')}</Link>
              </p>
              {!item.read ? <span className="si-tag">{t('unread')}</span> : null}
              {item.hasViewingRequest ? (
                <span className="si-tag">{t('viewingRequest')}</span>
              ) : null}
              {item.badgeDisplay !== 'none' ? (
                <InboxBadge item={item} locale={locale} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InboxBadge({ item, locale }: { item: SellerInboxItemWire; locale: string }) {
  const t = useTranslations('sellerInbox');
  const badge = item.badge;
  if (!badge) return null;

  const titleKey =
    item.badgeDisplay === 'valid'
      ? 'badge.valid'
      : item.badgeDisplay === 'expired'
        ? 'badge.expired'
        : 'badge.none';
  const title = t(titleKey);
  if (!title) return null;

  return (
    <div className="si-badge" data-testid="seller-inbox-badge">
      <p className="si-badge__title">{title}</p>
      <p className="si-badge__band">
        {t('bandMax', { amount: formatBandAmount(badge.bandMaxCents, locale) })}
      </p>
      <p className="si-badge__initials">{t('holderInitials', { initials: badge.holderInitials })}</p>
    </div>
  );
}
