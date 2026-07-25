'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

type Props = {
  /** Locale path of this listing page (for visitors), e.g. /it/listings/slug */
  pageUrl: string;
  shareSectionId?: string;
};

/** Landing-page share actions: copy/share page URL + jump to Smart Link tools. */
export function ListingShareActions({ pageUrl, shareSectionId = 'listing-smartlink' }: Props) {
  const t = useTranslations('listingDetail.share');
  const [copied, setCopied] = useState(false);

  const resolveUrl = useCallback(() => {
    if (typeof window === 'undefined') return pageUrl;
    return pageUrl.startsWith('/') ? `${window.location.origin}${pageUrl}` : pageUrl;
  }, [pageUrl]);

  const copyPage = useCallback(async () => {
    await navigator.clipboard.writeText(resolveUrl());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [resolveUrl]);

  const nativeShare = useCallback(async () => {
    const url = resolveUrl();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ url, title: document.title });
        return;
      } catch {
        /* cancelled */
      }
    }
    await copyPage();
  }, [copyPage, resolveUrl]);

  const scrollToSmartLink = () => {
    if (window.location.hash !== '#valuation') {
      window.history.replaceState(null, '', '#valuation');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    // Tab panel mounts after React paint — wait before scrolling.
    window.setTimeout(() => {
      document.getElementById(shareSectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={() => void nativeShare()}>
        {copied ? t('copied') : t('share')}
      </Button>
      <Button type="button" onClick={scrollToSmartLink}>
        {t('smartLink')}
      </Button>
    </div>
  );
}
