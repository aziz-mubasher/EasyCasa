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
};

/**
 * Listing header actions:
 * - Share → social / email / copy the listing URL
 * - Smart Link → open (or create then open) the public Smart Link landing page
 */
export function ListingShareActions({ pageUrl, listingId, listingTitle }: Props) {
  const t = useTranslations('listingDetail.share');
  const locale = useLocale();
  const { getAccessToken } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [smartBusy, setSmartBusy] = useState(false);
  const [smartError, setSmartError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const resolvePageUrl = useCallback(() => {
    if (typeof window === 'undefined') return pageUrl;
    return pageUrl.startsWith('/') ? `${window.location.origin}${pageUrl}` : pageUrl;
  }, [pageUrl]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(resolvePageUrl());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
    setMenuOpen(false);
  }, [resolvePageUrl]);

  const shareEmail = () => {
    const url = resolvePageUrl();
    const subject = encodeURIComponent(listingTitle);
    const body = encodeURIComponent(`${listingTitle}\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setMenuOpen(false);
  };

  const shareWhatsApp = () => {
    const url = resolvePageUrl();
    const text = encodeURIComponent(`${listingTitle}\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    setMenuOpen(false);
  };

  const shareFacebook = () => {
    const url = encodeURIComponent(resolvePageUrl());
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      '_blank',
      'noopener,noreferrer',
    );
    setMenuOpen(false);
  };

  const shareTelegram = () => {
    const url = encodeURIComponent(resolvePageUrl());
    const text = encodeURIComponent(listingTitle);
    window.open(
      `https://t.me/share/url?url=${url}&text=${text}`,
      '_blank',
      'noopener,noreferrer',
    );
    setMenuOpen(false);
  };

  const openSmartLinkLanding = async () => {
    setSmartBusy(true);
    setSmartError(null);
    // Open synchronously so popup blockers allow the landing page after await.
    const popup = window.open('about:blank', '_blank');
    try {
      const token = await getAccessToken();
      if (!token) {
        popup?.close();
        setSmartError(t('smartLinkSignIn'));
        window.location.hash = 'valuation';
        window.setTimeout(() => {
          document.getElementById('listing-smartlink')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 100);
        return;
      }

      const mine = await listMyShareLinks(authedFetch);
      let link = mine.find((r) => r.listingId === listingId && !r.revokedAt) ?? null;
      if (!link) {
        link = await createShareLink(authedFetch, listingId, true);
      }
      const publicUrl = smartLinkPublicUrl(link.token, locale);
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

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="relative" ref={menuRef}>
          <Button
            type="button"
            variant="outline"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {copied ? t('copied') : t('share')}
          </Button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 min-w-[12rem] rounded-xl border border-line bg-paper py-1 shadow-lg"
            >
              <ShareMenuItem label={t('copy')} onClick={() => void copyLink()} />
              <ShareMenuItem label={t('email')} onClick={shareEmail} />
              <ShareMenuItem label={t('whatsapp')} onClick={shareWhatsApp} />
              <ShareMenuItem label={t('facebook')} onClick={shareFacebook} />
              <ShareMenuItem label={t('telegram')} onClick={shareTelegram} />
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          disabled={smartBusy}
          onClick={() => void openSmartLinkLanding()}
        >
          {smartBusy ? t('smartLinkOpening') : t('smartLink')}
        </Button>
      </div>
      {smartError ? <p className="text-xs text-clay max-w-xs text-right">{smartError}</p> : null}
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
