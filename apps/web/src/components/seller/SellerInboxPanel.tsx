'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { notFound } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { InboxSort } from '@easycasa/shared';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { Link } from '@/i18n/routing';
import {
  buildEnquiriesQuery,
  formatInboxReceivedAt,
  inboxListingOptions,
  isSellerInboxDisabled,
  type InboxListResponse,
  type InboxUiFilter,
} from '@/lib/seller-inbox';

import { SellerInboxBadge } from './SellerInboxBadge';
import './seller-inbox.css';

type LoadState = 'loading' | 'ready' | 'error' | 'disabled';

/** EC-S-T20 — seller enquiry inbox (flag-gated API, mobile-first). */
export function SellerInboxPanel() {
  const t = useTranslations('sellerInbox');
  const locale = useLocale();
  const { ready, isAuthenticated, signIn, getAccessToken } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);

  const [sort, setSort] = useState<InboxSort>('newest');
  const [filter, setFilter] = useState<InboxUiFilter>({
    badgedOnly: false,
    unreadOnly: false,
  });
  const [data, setData] = useState<InboxListResponse | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await authedFetch(
        apiUrl(`/seller/enquiries${buildEnquiriesQuery(sort, filter)}`),
        { headers: { Accept: 'application/json' } },
      );
      if (isSellerInboxDisabled(res.status)) {
        setState('disabled');
        return;
      }
      if (!res.ok) {
        setState('error');
        setData(null);
        return;
      }
      const json = (await res.json()) as InboxListResponse;
      setData(json);
      setState('ready');
    } catch {
      setState('error');
      setData(null);
    }
  }, [authedFetch, sort, filter]);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      setState('ready');
      setData(null);
      return;
    }
    void load();
  }, [ready, isAuthenticated, load]);

  useEffect(() => {
    if (state === 'disabled') notFound();
  }, [state]);

  async function markRead(id: string) {
    setMarkingId(id);
    try {
      const res = await authedFetch(apiUrl(`/seller/enquiries/${encodeURIComponent(id)}/read`), {
        method: 'PATCH',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) await load();
    } finally {
      setMarkingId(null);
    }
  }

  if (!ready || (isAuthenticated && state === 'loading')) {
    return (
      <div className="si-panel" aria-busy="true">
        <p className="si-muted">{t('loading')}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="si-panel">
        <p className="si-muted">{t('signIn')}</p>
        <button
          type="button"
          className="si-btn"
          onClick={() =>
            void signIn(typeof window !== 'undefined' ? window.location.pathname : '/seller/inbox')
          }
        >
          {t('signInCta')}
        </button>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="si-panel" role="alert">
        <p className="si-muted">{t('error')}</p>
      </div>
    );
  }

  const listingOptions = inboxListingOptions(data);

  return (
    <section className="si-panel" data-testid="seller-inbox-panel">
      <header className="si-header">
        <div>
          <h1 className="si-title">{t('title')}</h1>
          {data && data.unreadTotal > 0 ? (
            <p className="si-muted">{t('unreadCount', { count: data.unreadTotal })}</p>
          ) : null}
        </div>
      </header>

      <div className="si-controls">
        <label className="si-field">
          <span className="si-field__label">{t('sortLabel')}</span>
          <select
            className="si-field__select"
            value={sort}
            onChange={(e) => setSort(e.target.value as InboxSort)}
            data-testid="seller-inbox-sort"
          >
            <option value="newest">{t('sortNewest')}</option>
            <option value="badge_first">{t('sortBadgeFirst')}</option>
            <option value="unread_first">{t('sortUnreadFirst')}</option>
          </select>
        </label>

        {listingOptions.length > 1 ? (
          <label className="si-field">
            <span className="si-field__label">{t('listingLabel')}</span>
            <select
              className="si-field__select"
              value={filter.listingId ?? ''}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  listingId: e.target.value || undefined,
                }))
              }
              data-testid="seller-inbox-listing"
            >
              <option value="">{t('allListings')}</option>
              {listingOptions.map((id) => (
                <option key={id} value={id}>
                  {t('listingOption', {
                    id: id.slice(0, 8),
                    unread: data?.perListingUnread[id] ?? 0,
                  })}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="si-checks">
          <label className="si-check">
            <input
              type="checkbox"
              checked={filter.badgedOnly}
              onChange={(e) => setFilter((prev) => ({ ...prev, badgedOnly: e.target.checked }))}
              data-testid="seller-inbox-filter-badged"
            />
            {t('filterBadgedOnly')}
          </label>
          <label className="si-check">
            <input
              type="checkbox"
              checked={filter.unreadOnly}
              onChange={(e) => setFilter((prev) => ({ ...prev, unreadOnly: e.target.checked }))}
              data-testid="seller-inbox-filter-unread"
            />
            {t('filterUnreadOnly')}
          </label>
        </div>
      </div>

      {!data || data.items.length === 0 ? (
        <div className="rounded-xl2 border border-line bg-paper p-5">
          <p className="si-muted">{t('empty')}</p>
        </div>
      ) : (
        <ul className="si-list">
          {data.items.map((item) => (
            <li
              key={item.id}
              className={`si-card${item.read ? '' : ' si-card--unread'}`}
              data-testid="seller-inbox-item"
              data-read={item.read ? 'true' : 'false'}
            >
              <div className="si-card__head">
                <p className="si-card__meta">
                  {t('receivedAt', {
                    when: formatInboxReceivedAt(item.receivedAt, locale),
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {!item.read ? <span className="si-pill si-pill--unread">{t('unread')}</span> : null}
                  {item.hasViewingRequest ? (
                    <span className="si-pill">{t('viewingRequest')}</span>
                  ) : null}
                </div>
              </div>

              <p className="si-card__meta">
                <Link href={`/listings/${item.listingId}`} className="si-listing-link">
                  {t('listingLink', { id: item.listingId.slice(0, 8) })}
                </Link>
              </p>

              <SellerInboxBadge item={item} locale={locale} />

              {!item.read ? (
                <button
                  type="button"
                  className="si-btn"
                  disabled={markingId === item.id}
                  onClick={() => void markRead(item.id)}
                >
                  {t('markRead')}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
