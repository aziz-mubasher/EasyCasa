'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/auth/AuthProvider';
import { createAuthedFetch } from '@/auth/authedFetch';
import {
  createShareLink,
  listMyShareLinks,
  smartLinkPublicUrl,
} from '@/lib/smartlink';

type Props = {
  /** Locale path of this listing page, e.g. /it/listings/slug */
  pageUrl: string;
  listingId: string;
  listingTitle: string;
  /** Tighter buttons for the listing landing header. */
  compact?: boolean;
};

/**
 * Listing header actions:
 * - Share → social / email / copy the listing URL
 * - Smart Link → menu with market-evaluation toggle + open/create
 */
export function ListingShareActions({
  pageUrl,
  listingId,
  listingTitle,
  compact = false,
}: Props) {
  const t = useTranslations('listingDetail.share');
  const locale = useLocale();
  const { getAccessToken } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);

  const [shareOpen, setShareOpen] = useState(false);
  const [smartOpen, setSmartOpen] = useState(false);
  const [includeBand, setIncludeBand] = useState(true);
  const [copied, setCopied] = useState(false);
  const [smartBusy, setSmartBusy] = useState(false);
  const [smartError, setSmartError] = useState<string | null>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const smartRef = useRef<HTMLDivElement>(null);

  const resolvePageUrl = useCallback(() => {
    if (typeof window === 'undefined') return pageUrl;
    return pageUrl.startsWith('/') ? `${window.location.origin}${pageUrl}` : pageUrl;
  }, [pageUrl]);

  useEffect(() => {
    if (!shareOpen && !smartOpen) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (shareOpen && shareRef.current && !shareRef.current.contains(target)) {
        setShareOpen(false);
      }
      if (smartOpen && smartRef.current && !smartRef.current.contains(target)) {
        setSmartOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShareOpen(false);
        setSmartOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [shareOpen, smartOpen]);

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(resolvePageUrl());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
    setShareOpen(false);
  }, [resolvePageUrl]);

  const shareEmail = () => {
    const url = resolvePageUrl();
    const subject = encodeURIComponent(listingTitle);
    const body = encodeURIComponent(`${listingTitle}\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShareOpen(false);
  };

  const shareWhatsApp = () => {
    const url = resolvePageUrl();
    const text = encodeURIComponent(`${listingTitle}\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    setShareOpen(false);
  };

  const shareFacebook = () => {
    const url = encodeURIComponent(resolvePageUrl());
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      '_blank',
      'noopener,noreferrer',
    );
    setShareOpen(false);
  };

  const shareTelegram = () => {
    const url = encodeURIComponent(resolvePageUrl());
    const text = encodeURIComponent(listingTitle);
    window.open(
      `https://t.me/share/url?url=${url}&text=${text}`,
      '_blank',
      'noopener,noreferrer',
    );
    setShareOpen(false);
  };

  const openSmartLinkLanding = async () => {
    setSmartBusy(true);
    setSmartError(null);
    const popup = window.open('about:blank', '_blank');
    try {
      const token = await getAccessToken();
      if (!token) {
        popup?.close();
        setSmartError(t('smartLinkSignIn'));
        return;
      }

      const mine = await listMyShareLinks(authedFetch);
      const matching = mine.filter((r) => r.listingId === listingId && !r.revokedAt);
      let link =
        matching.find((r) => r.includeValuationBand === includeBand) ?? matching[0] ?? null;
      if (!link || link.includeValuationBand !== includeBand) {
        link = await createShareLink(authedFetch, listingId, includeBand);
      }
      const publicUrl = smartLinkPublicUrl(link.token, locale);
      setSmartOpen(false);
      if (popup) {
        popup.location.href = publicUrl;
      } else {
        window.location.assign(publicUrl);
      }
    } catch {
      popup?.close();
      setSmartError(t('smartLinkError'));
    } finally {
      setSmartBusy(false);
    }
  };

  const btnClass = compact ? '!px-3 !py-1.5 !text-xs' : '';

  return (
    <div className="relative flex flex-col items-stretch sm:items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="relative" ref={shareRef}>
          <Button
            type="button"
            variant="outline"
            className={btnClass}
            aria-expanded={shareOpen}
            aria-haspopup="menu"
            onClick={() => {
              setShareOpen((o) => !o);
              setSmartOpen(false);
            }}
          >
            {copied ? t('copied') : t('share')}
          </Button>
          {shareOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-40 mt-2 min-w-[12rem] rounded-xl border border-line bg-paper py-1 shadow-lg"
            >
              <ShareMenuItem label={t('copy')} onClick={() => void copyLink()} />
              <ShareMenuItem label={t('email')} onClick={shareEmail} />
              <ShareMenuItem label={t('whatsapp')} onClick={shareWhatsApp} />
              <ShareMenuItem label={t('facebook')} onClick={shareFacebook} />
              <ShareMenuItem label={t('telegram')} onClick={shareTelegram} />
            </div>
          ) : null}
        </div>

        <div className="relative" ref={smartRef}>
          <Button
            type="button"
            className={btnClass}
            aria-expanded={smartOpen}
            aria-haspopup="menu"
            onClick={() => {
              setSmartOpen((o) => !o);
              setShareOpen(false);
            }}
          >
            {t('smartLink')}
          </Button>
          {smartOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-40 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-line bg-paper p-3 shadow-lg space-y-3"
            >
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-[var(--azure)]"
                  checked={includeBand}
                  onChange={(e) => setIncludeBand(e.target.checked)}
                />
                <span>{t('includeBand')}</span>
              </label>
              <Button
                type="button"
                className="w-full"
                disabled={smartBusy}
                onClick={() => void openSmartLinkLanding()}
              >
                {smartBusy ? t('smartLinkOpening') : t('smartLinkOpen')}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {smartError ? (
        <p className="text-[10px] sm:text-xs text-clay max-w-[16rem] text-right leading-snug">
          {smartError}
        </p>
      ) : null}
    </div>
  );
}

function ShareMenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      className="block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-sand/70"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
